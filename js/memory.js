/* -------------------------------------------------------------
 * BREWMIND AI - Memory & Settings Manager
 * ------------------------------------------------------------- */

const STORAGE_KEYS = {
  PROFILE: 'brewmind_profile',
  PREFERENCES: 'brewmind_preferences',
  RECOMMENDATIONS: 'brewmind_recommendations',
  CHAT_HISTORY: 'brewmind_chat_history',
  DASHBOARD_LAYOUT: 'brewmind_layout',
  NOTIF_PREFS: 'brewmind_notification_prefs',
  DEMO_PREFS: 'brewmind_demo_prefs'
};

const DEFAULT_PROFILE = {
  managerName: '',
  cafeName: '',
  storeType: 'Standard', // Standard, Boutique, Drive-Thru, Roastery
  operatingHours: '06:00 AM - 08:00 PM',
  city: 'San Francisco',
  geminiKey: '',
  aiProvider: 'lm-studio',
  aiEndpoint: 'http://127.0.0.1:1234'
};

const DEFAULT_PREFERENCES = {
  theme: 'dark', // dark-coffee, dark-modern
  soundEnabled: true,
  voiceEnabled: false,
  notificationsMuted: false
};

class MemoryManager {
  constructor() {
    this.profile = this.load(STORAGE_KEYS.PROFILE, { ...DEFAULT_PROFILE });
    this.preferences = this.load(STORAGE_KEYS.PREFERENCES, { ...DEFAULT_PREFERENCES });
    
    // Recommendations memory (Long-Term)
    const recs = this.load(STORAGE_KEYS.RECOMMENDATIONS, { accepted: [], rejected: [] });
    this.acceptedRecommendations = recs.accepted || [];
    this.rejectedRecommendations = recs.rejected || [];
    
    this.chatHistory = this.load(STORAGE_KEYS.CHAT_HISTORY, []);
    this.favoriteLayout = this.load(STORAGE_KEYS.DASHBOARD_LAYOUT, 'default');
    
    // Notification & Demo preferences
    this.notificationPreferences = this.load(STORAGE_KEYS.NOTIF_PREFS, {
      sound: true,
      visual: true,
      criticalOnly: false
    });
    this.demoPreferences = this.load(STORAGE_KEYS.DEMO_PREFS, {
      autoApplyRecommendations: false,
      speedFactor: 1
    });

    // Session accepted recommendations cache
    this.sessionAcceptedRecs = [];
  }

  /**
   * Helper: Load JSON from LocalStorage.
   */
  load(key, defaultValue) {
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : defaultValue;
    } catch (e) {
      console.error(`Error loading storage key ${key}:`, e);
      return defaultValue;
    }
  }

  /**
   * Helper: Save JSON to LocalStorage.
   */
  save(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.error(`Error writing storage key ${key}:`, e);
    }
  }

  /**
   * Check if the user has completed their first-run onboarding setup.
   */
  hasProfile() {
    return this.profile.managerName !== '' && this.profile.cafeName !== '';
  }

  /**
   * Update and save user/cafe profiles.
   */
  updateProfile(profileChanges) {
    this.profile = { ...this.profile, ...profileChanges };
    this.save(STORAGE_KEYS.PROFILE, this.profile);
    
    // Dispatch profile changes to global state
    if (window.BrewMind && window.BrewMind.updateState) {
      window.BrewMind.updateState({
        manager: { name: this.profile.managerName },
        shop: {
          name: this.profile.cafeName,
          type: this.profile.storeType,
          city: this.profile.city,
          operatingHours: this.profile.operatingHours
        }
      });
      window.BrewMind.dispatch('brewmind:profilechange', this.profile);
    }
  }

  /**
   * Update preferences (theme, audio context, etc.).
   */
  updatePreferences(prefChanges) {
    this.preferences = { ...this.preferences, ...prefChanges };
    this.save(STORAGE_KEYS.PREFERENCES, this.preferences);
    
    if (window.BrewMind && window.BrewMind.updateState) {
      window.BrewMind.updateState({
        theme: this.preferences.theme,
        copilot: {
          soundEnabled: this.preferences.soundEnabled,
          voiceEnabled: this.preferences.voiceEnabled
        }
      });
    }
  }

  /**
   * Record recommendation action.
   * @param {string} id 
   * @param {Object} details 
   * @param {string} status 'accepted' | 'rejected'
   */
  logRecommendation(id, details, status) {
    const timestamp = new Date().toISOString();
    const entry = { id, timestamp, details };
    
    if (status === 'accepted') {
      this.acceptedRecommendations.push(entry);
      this.sessionAcceptedRecs.push(entry);
    } else {
      this.rejectedRecommendations.push(entry);
    }

    this.save(STORAGE_KEYS.RECOMMENDATIONS, {
      accepted: this.acceptedRecommendations,
      rejected: this.rejectedRecommendations
    });

    this.syncStateMemory();
  }

  /**
   * Append query message logs.
   */
  saveChatMessage(role, text) {
    const msgId = 'chat_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
    this.chatHistory.push({
      id: msgId,
      role,
      text,
      timestamp: new Date().toISOString()
    });

    if (this.chatHistory.length > 50) {
      this.chatHistory.shift();
    }
    this.save(STORAGE_KEYS.CHAT_HISTORY, this.chatHistory);
    this.syncStateMemory();
  }

  /**
   * Sync memory attributes to global application state.
   */
  syncStateMemory() {
    if (window.BrewMind && window.BrewMind.updateState) {
      window.BrewMind.updateState({
        memory: {
          chatHistory: this.chatHistory,
          acceptedRecs: this.acceptedRecommendations,
          rejectedRecs: this.rejectedRecommendations,
          sessionAcceptedRecs: this.sessionAcceptedRecs
        }
      });
      window.BrewMind.dispatch('brewmind:memorychange', window.BrewMind.state.memory);
    }
  }

  /**
   * Get all memory items grouped by the requested category.
   * @param {string} category 'short-term' | 'session' | 'long-term'
   */
  getMemoriesByCategory(category) {
    const state = window.BrewMind.getState();
    if (category === 'short-term') {
      return [
        ...this.chatHistory.map(h => ({ id: h.id, type: 'Conversation Log', desc: `[${h.role.toUpperCase()}] "${h.text.substring(0, 40)}${h.text.length > 40 ? '...' : ''}"` })),
        { id: 'st_scenario', type: 'Current Scenario', desc: state.demo?.activeScenario ? `Active demo event: ${state.demo.activeScenario}` : 'Normal operations mode baseline' }
      ];
    }
    
    if (category === 'session') {
      const journalList = (state.journal || []).map(j => ({ id: j.id, type: 'Journal Entry', desc: `Hour ${j.time}: "${j.summary.substring(0, 50)}..."` }));
      const goalsList = state.activeGoal ? [{ id: 'active_goal', type: 'Active Daily Goal', desc: `Goal: ${state.activeGoal.description} (${state.activeGoal.progress}% progress)` }] : [];
      const sessionRecsList = this.sessionAcceptedRecs.map(r => ({ id: r.id, type: 'Session Accepted Rec', desc: `Applied: ${r.details.title || r.details.recommendation || 'Operational adjustment'}` }));
      
      return [...journalList, ...goalsList, ...sessionRecsList];
    }

    if (category === 'long-term') {
      const acceptedList = this.acceptedRecommendations.map(r => ({ id: r.id, type: 'Accepted Recommendation', desc: `Applied: ${r.details.title || r.details.recommendation || 'Operational adjustment'}` }));
      const rejectedList = this.rejectedRecommendations.map(r => ({ id: r.id, type: 'Rejected Recommendation', desc: `Dismissed: ${r.details.title || r.details.recommendation || 'Operational adjustment'}` }));
      const profileInfo = [{ id: 'profile_settings', type: 'AI Manager Profile', desc: `Cafe: ${this.profile.cafeName || 'Not Set'} &bull; Manager: ${this.profile.managerName || 'Not Set'}` }];
      const providerInfo = [{ id: 'ai_settings', type: 'AI Settings', desc: `Provider: ${this.profile.aiProvider || 'gemini'} &bull; Endpoint: ${this.profile.aiEndpoint || 'Default'}` }];

      return [...acceptedList, ...rejectedList, ...profileInfo, ...providerInfo];
    }

    return [];
  }

  /**
   * Delete an individual memory item by ID across categories.
   * @param {string} category 
   * @param {string} id 
   */
  deleteMemoryItem(category, id) {
    if (category === 'short-term') {
      this.chatHistory = this.chatHistory.filter(h => h.id !== id);
      this.save(STORAGE_KEYS.CHAT_HISTORY, this.chatHistory);
    } else if (category === 'session') {
      const state = window.BrewMind.getState();
      if (state.journal) {
        state.journal = state.journal.filter(j => j.id !== id);
        window.BrewMind.updateState({ journal: state.journal });
      }
      this.sessionAcceptedRecs = this.sessionAcceptedRecs.filter(r => r.id !== id);
    } else if (category === 'long-term') {
      this.acceptedRecommendations = this.acceptedRecommendations.filter(r => r.id !== id);
      this.rejectedRecommendations = this.rejectedRecommendations.filter(r => r.id !== id);
      this.save(STORAGE_KEYS.RECOMMENDATIONS, {
        accepted: this.acceptedRecommendations,
        rejected: this.rejectedRecommendations
      });
    }
    
    this.syncStateMemory();
  }

  /**
   * Update layout configs.
   */
  saveFavoriteLayout(layoutId) {
    this.favoriteLayout = layoutId;
    this.save(STORAGE_KEYS.DASHBOARD_LAYOUT, layoutId);
  }

  /**
   * Update notifications profiles.
   */
  updateNotificationPrefs(prefs) {
    this.notificationPreferences = { ...this.notificationPreferences, ...prefs };
    this.save(STORAGE_KEYS.NOTIF_PREFS, this.notificationPreferences);
  }

  /**
   * Update simulation/demo parameters.
   */
  updateDemoPrefs(prefs) {
    this.demoPreferences = { ...this.demoPreferences, ...prefs };
    this.save(STORAGE_KEYS.DEMO_PREFS, this.demoPreferences);
  }

  /**
   * Clear localStorage arrays.
   */
  clearAllMemory() {
    Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
    
    this.profile = { ...DEFAULT_PROFILE };
    this.preferences = { ...DEFAULT_PREFERENCES };
    this.acceptedRecommendations = [];
    this.rejectedRecommendations = [];
    this.chatHistory = [];
    this.sessionAcceptedRecs = [];
    this.favoriteLayout = 'default';
    this.notificationPreferences = { sound: true, visual: true, criticalOnly: false };
    this.demoPreferences = { autoApplyRecommendations: false, speedFactor: 1 };
    
    this.syncStateMemory();
  }
}

export const memory = new MemoryManager();

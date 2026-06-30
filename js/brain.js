/* -------------------------------------------------------------
 * BREWMIND AI - Autonomous Observation Engine (Brain)
 * ------------------------------------------------------------- */

/**
 * Evaluates the current state of the simulation café to generate observations.
 * @param {Object} state - The global BrewMind state object
 * @returns {Array} List of structured observation objects
 */
export function generateObservations(state) {
  const insights = [];
  const goal = state.activeGoal?.type || 'Reduce Wait Time';
  const decimalTime = state.clock.hours + state.clock.minutes / 60;
  const elapsedHours = Math.max(0.1, decimalTime - 6.0);
  const queueLength = state.customers.queueLength || 0;
  const waitTime = state.customers.avgWaitTime || 0;

  // 1. Queue bottleneck alert
  if (queueLength > 8) {
    insights.push({
      id: 'ins_queue',
      observation: "Queue bottleneck detected — line is growing faster than baristas can serve.",
      reasoning: `${queueLength} students are waiting during ${state.campusActivity}. At current barista throughput, the line will take ${Math.ceil(queueLength * 1.5)} minutes to clear. Customer patience is degrading.`,
      confidence: 92,
      impact: `-${Math.min(25, queueLength * 2)}% Satisfaction`,
      action: "Assign Sophia to Espresso registers to double line capacity",
      autoApplyFlag: 'optimize-staff'
    });
  }

  // 2. Barista stress alerts (check all staff)
  const stressedBarista = state.staff.list.find(b => b.stress > 65);
  if (stressedBarista) {
    insights.push({
      id: 'ins_stress_' + stressedBarista.name,
      observation: `${stressedBarista.name}'s stress level has reached ${stressedBarista.stress}% — quality will degrade.`,
      reasoning: `High-volume order processing has pushed ${stressedBarista.name} past the 65% stress threshold. Quality scores drop by ~12% above this level, increasing complaint probability.`,
      confidence: 88,
      impact: "-8% Quality Control",
      action: `Rotate ${stressedBarista.name} to lighter duties and redistribute orders`,
      autoApplyFlag: 'optimize-staff'
    });
  }

  // 3. Milk stock depletion
  const milk = state.inventory.milk;
  const milkPct = (milk.current / milk.max) * 100;
  if (milkPct < 35) {
    const cost = (milk.max - milk.current) * milk.price;
    const ratePerHour = ((milk.max - milk.current) / elapsedHours).toFixed(1);
    const minutesLeft = milk.current > 0 ? Math.round((milk.current / ((milk.max - milk.current) / elapsedHours)) * 60) : 0;
    insights.push({
      id: 'ins_milk_low',
      observation: `Dairy reserves at ${milkPct.toFixed(0)}% — estimated stockout in ${minutesLeft} minutes.`,
      reasoning: `Consumption rate is ${ratePerHour} L/hour driven by Latte and Flat White demand. Current stock: ${milk.current.toFixed(1)}L of ${milk.max}L capacity.`,
      confidence: 95,
      impact: `Stockout in ~${minutesLeft}m`,
      action: `Restock Dairy & Oat Milk ($${cost.toFixed(2)})`,
      autoApplyFlag: 'restock-milk'
    });
  }

  // 4. Coffee Beans depletion
  const beans = state.inventory.coffeeBeans;
  const beansPct = (beans.current / beans.max) * 100;
  if (beansPct < 35) {
    const cost = (beans.max - beans.current) * beans.price;
    const ratePerHour = ((beans.max - beans.current) / elapsedHours).toFixed(2);
    insights.push({
      id: 'ins_beans_low',
      observation: `Espresso bean reserves critically low at ${beansPct.toFixed(0)}%.`,
      reasoning: `Roast consumption is running at ${ratePerHour} kg/hour. At this rate, bean stock will be exhausted before closing unless restocked now.`,
      confidence: 91,
      impact: "Fulfillment halt risk",
      action: `Restock Espresso Roast ($${cost.toFixed(2)})`,
      autoApplyFlag: 'restock-beans'
    });
  }

  // 5. Cups running low
  const cups = state.inventory.cups;
  const cupsPct = (cups.current / cups.max) * 100;
  if (cupsPct < 25) {
    insights.push({
      id: 'ins_cups_low',
      observation: `Paper cup supply at ${cupsPct.toFixed(0)}% — only ${cups.current} cups remaining.`,
      reasoning: `Each order uses 1 cup. With ${state.orders.completed} orders already served today, cup reserves are depleting faster than typical. Restock recommended.`,
      confidence: 89,
      impact: "Service disruption risk",
      action: "Restock cups from supply closet",
      autoApplyFlag: 'keep-nominal'
    });
  }

  // 6. Machine health degradation
  if (state.machineHealth < 75) {
    insights.push({
      id: 'ins_machine_wear',
      observation: `Espresso Machine B health dropped to ${state.machineHealth}% — preventive maintenance needed.`,
      reasoning: `Continuous high-pressure heating cycles during peak hours are causing boiler seal degradation. Below 50% health, thermal failure becomes likely.`,
      confidence: 90,
      impact: "Risk of Complete Failure",
      action: "Run preventive machine calibration",
      autoApplyFlag: 'repair-machine'
    });
  }

  // 7. Rush hour active — operational awareness
  if (state.rushHourStatus && queueLength > 3) {
    insights.push({
      id: 'ins_rush_active',
      observation: `Campus rush hour is active — demand is elevated with ${queueLength} in queue.`,
      reasoning: `Current period matches "${state.expectedNextRush || 'Class Break Rush'}" schedule. Student foot traffic is ${Math.round((state.campusPopulation || 12000) / 1000)}K. Expect sustained arrivals for the next 15-20 minutes.`,
      confidence: 85,
      impact: "+40% Order Volume",
      action: "All baristas to maximum throughput mode",
      autoApplyFlag: 'optimize-staff'
    });
  }

  // 8. Revenue milestone celebration
  const revMilestones = [500, 1000, 2000, 3000, 5000];
  const lastMilestone = revMilestones.filter(m => state.revenue >= m).pop();
  if (lastMilestone && lastMilestone >= 1000 && !state.rushHourStatus) {
    const hourlyRate = (state.revenue / elapsedHours).toFixed(2);
    insights.push({
      id: 'ins_revenue_milestone',
      observation: `Revenue has crossed the $${lastMilestone.toLocaleString()} mark — strong performance today.`,
      reasoning: `Hourly run rate is $${hourlyRate}/hour. At this pace, projected closing revenue is $${state.predictions?.closingRevenue?.toFixed(2) || 'calculating...'}.`,
      confidence: 96,
      impact: "+Revenue Confidence",
      action: "Maintain current operational tempo",
      autoApplyFlag: 'keep-nominal'
    });
  }

  // 9. Satisfaction dropping
  if (state.customerSatisfaction < 60) {
    insights.push({
      id: 'ins_satisfaction_drop',
      observation: `Customer satisfaction has dropped to ${state.customerSatisfaction}% — intervention needed.`,
      reasoning: `Long wait times (${waitTime.toFixed(1)}m avg) and queue congestion (${queueLength} students) are the primary drivers. Students are leaving negative feedback.`,
      confidence: 93,
      impact: "-5 Reputation/hour",
      action: "Prioritize speed: move Liam to support Emma on registers",
      autoApplyFlag: 'optimize-staff'
    });
  }

  // 10. Weather-drink correlation insight
  if (state.weather.condition === 'Rainy' && decimalTime > 8) {
    insights.push({
      id: 'ins_weather_rainy',
      observation: "Rainy conditions detected — warm beverage demand is trending upward.",
      reasoning: `Rain typically increases hot drink orders by 25-30% while cold drink sales drop. Consider promoting Hot Chocolate and Masala Tea specials.`,
      confidence: 82,
      impact: "+25% Hot Drinks Demand",
      action: "Feature warm specialty drinks on the menu board",
      autoApplyFlag: 'keep-nominal'
    });
  }

  // 11. Goal alignment check
  if (goal === 'Reduce Wait Time' && waitTime > 2.5) {
    insights.push({
      id: 'ins_goal_wait',
      observation: `Operations are misaligned with today's goal: "${goal}".`,
      reasoning: `Average wait is ${waitTime.toFixed(1)} minutes vs. target of <2.5 minutes. Register throughput needs optimization — consider shifting Emma to espresso-only.`,
      confidence: 94,
      impact: "+18% Queue Speed",
      action: "Optimize staff shifts for speed",
      autoApplyFlag: 'optimize-goal'
    });
  } else if (goal === 'Maximize Revenue' && state.revenue < (elapsedHours * 80)) {
    insights.push({
      id: 'ins_goal_revenue',
      observation: `Revenue is below target for "${goal}" — currently $${(state.revenue / elapsedHours).toFixed(0)}/hour.`,
      reasoning: `Target hourly rate should be $80+/hour. Consider promoting premium items like specialty cold brews and baked goods combos.`,
      confidence: 87,
      impact: "+$20/hour potential",
      action: "Promote premium upsell items",
      autoApplyFlag: 'optimize-goal'
    });
  }

  // Fallback: all systems nominal
  if (insights.length === 0) {
    const staffAvgStress = Math.round(state.staff.list.reduce((a, b) => a + b.stress, 0) / state.staff.list.length);
    insights.push({
      id: 'ins_nominal',
      observation: "All systems are running at optimal capacity — no issues detected.",
      reasoning: `Queue: ${queueLength} students. Wait time: ${waitTime.toFixed(1)}m. Staff avg stress: ${staffAvgStress}%. All 14 inventory items are within safe margins.`,
      confidence: 99,
      impact: "+10% Rolling Reputation",
      action: "Maintain current configuration",
      autoApplyFlag: 'keep-nominal'
    });
  }

  // Limit to top 3 most relevant insights
  return insights.slice(0, 3);
}

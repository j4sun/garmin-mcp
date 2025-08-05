import { Activity, HealthMetrics } from './garmin-client.js';

export class TrainingAnalyzer {
  
  async analyzeActivity(activity: Activity): Promise<string> {
    const insights = [];
    
    insights.push(`## Activity Analysis: ${activity.activityName}`);
    insights.push(`**Type:** ${activity.activityType}`);
    insights.push(`**Date:** ${new Date(activity.startTimeLocal).toLocaleDateString()}`);
    insights.push(`**Duration:** ${Math.round(activity.duration / 60)} minutes`);
    
    if (activity.distance) {
      insights.push(`**Distance:** ${(activity.distance / 1000).toFixed(2)} km`);
      
      if (activity.averageSpeed) {
        const pace = this.calculatePace(activity.averageSpeed);
        insights.push(`**Average Pace:** ${pace}`);
      }
    }
    
    if (activity.calories) {
      insights.push(`**Calories:** ${activity.calories}`);
    }
    
    if (activity.averageHeartRate) {
      insights.push(`**Average Heart Rate:** ${activity.averageHeartRate} bpm`);
      
      if (activity.maxHeartRate) {
        insights.push(`**Max Heart Rate:** ${activity.maxHeartRate} bpm`);
        
        // Heart rate zones analysis
        const hrZoneAnalysis = this.analyzeHeartRateZones(activity.averageHeartRate, activity.maxHeartRate);
        insights.push(`**Heart Rate Analysis:** ${hrZoneAnalysis}`);
      }
    }
    
    if (activity.elevationGain) {
      insights.push(`**Elevation Gain:** ${activity.elevationGain} m`);
    }
    
    if (activity.trainingStressScore) {
      insights.push(`**Training Stress Score:** ${activity.trainingStressScore}`);
      insights.push(`**Training Load:** ${this.categorizeTrainingLoad(activity.trainingStressScore)}`);
    }
    
    // Performance insights
    insights.push('\n### Performance Insights:');
    insights.push(this.generatePerformanceInsights(activity));
    
    return insights.join('\n');
  }
  
  async analyzeActivities(activities: Activity[]): Promise<string> {
    if (activities.length === 0) {
      return 'No activities found to analyze.';
    }
    
    const insights = [];
    
    insights.push(`## Activity Summary (${activities.length} activities)`);
    
    // Group by activity type
    const activityTypes = this.groupActivitiesByType(activities);
    
    for (const [type, typeActivities] of Object.entries(activityTypes)) {
      insights.push(`\n### ${type.charAt(0).toUpperCase() + type.slice(1)} Activities (${typeActivities.length})`);
      
      const totalDistance = typeActivities.reduce((sum, a) => sum + (a.distance || 0), 0);
      const totalDuration = typeActivities.reduce((sum, a) => sum + a.duration, 0);
      const avgHeartRate = this.calculateAverage(typeActivities.map(a => a.averageHeartRate).filter(Boolean));
      
      insights.push(`**Total Distance:** ${(totalDistance / 1000).toFixed(2)} km`);
      insights.push(`**Total Time:** ${Math.round(totalDuration / 3600)} hours`);
      
      if (avgHeartRate > 0) {
        insights.push(`**Average Heart Rate:** ${Math.round(avgHeartRate)} bpm`);
      }
      
      // Training load analysis
      const trainingScores = typeActivities.map(a => a.trainingStressScore).filter(Boolean);
      if (trainingScores.length > 0) {
        const avgTrainingLoad = this.calculateAverage(trainingScores);
        insights.push(`**Average Training Load:** ${avgTrainingLoad.toFixed(1)} (${this.categorizeTrainingLoad(avgTrainingLoad)})`);
      }
    }
    
    // Weekly trend analysis
    insights.push('\n### Weekly Trends:');
    insights.push(this.analyzeWeeklyTrends(activities));
    
    return insights.join('\n');
  }
  
  async generateTrainingSuggestions(
    activities: Activity[],
    healthMetrics: HealthMetrics,
    activityType: string
  ): Promise<string> {
    const suggestions = [];
    
    suggestions.push('# Training Suggestions');
    
    // Analyze recent training load
    const recentActivities = activities.slice(0, 7); // Last 7 days
    const trainingLoad = this.calculateTrainingLoad(recentActivities);
    
    suggestions.push(`\n## Current Training Status:`);
    suggestions.push(`**Recent Training Load:** ${trainingLoad.category} (${trainingLoad.score.toFixed(1)})`);
    
    if (healthMetrics.heartRate) {
      suggestions.push(`**Heart Rate Status:** Available`);
    }
    
    if (healthMetrics.steps) {
      suggestions.push(`**Daily Steps:** ${healthMetrics.steps}`);
    }
    
    // Recovery analysis
    suggestions.push('\n## Recovery Analysis:');
    suggestions.push(this.analyzeRecovery(healthMetrics));
    
    // Specific suggestions based on activity type
    suggestions.push('\n## Personalized Recommendations:');
    
    if (activityType === 'running' || activityType === 'all') {
      suggestions.push(this.generateRunningAdvice(activities, healthMetrics));
    }
    
    if (activityType === 'cycling' || activityType === 'all') {
      suggestions.push(this.generateCyclingAdvice(activities, healthMetrics));
    }
    
    if (activityType === 'strength' || activityType === 'all') {
      suggestions.push(this.generateStrengthAdvice(activities, healthMetrics));
    }
    
    // General training advice
    suggestions.push('\n## General Training Advice:');
    suggestions.push(this.generateGeneralAdvice(activities, healthMetrics));
    
    return suggestions.join('\n');
  }
  
  private calculatePace(speedMs: number): string {
    const kmh = speedMs * 3.6;
    const minPerKm = 60 / kmh;
    const minutes = Math.floor(minPerKm);
    const seconds = Math.round((minPerKm - minutes) * 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')} min/km`;
  }
  
  private analyzeHeartRateZones(avgHR: number, maxHR: number): string {
    const intensity = (avgHR / maxHR) * 100;
    
    if (intensity < 60) return 'Recovery/Easy pace';
    if (intensity < 70) return 'Aerobic base building';
    if (intensity < 80) return 'Aerobic/Tempo pace';
    if (intensity < 90) return 'Lactate threshold';
    return 'VO2 Max/Anaerobic';
  }
  
  private categorizeTrainingLoad(score: number): string {
    if (score < 150) return 'Low';
    if (score < 300) return 'Moderate';
    if (score < 450) return 'High';
    return 'Very High';
  }
  
  private generatePerformanceInsights(activity: Activity): string {
    const insights = [];
    
    if (activity.averageHeartRate && activity.maxHeartRate) {
      const hrReserve = activity.maxHeartRate - activity.averageHeartRate;
      if (hrReserve < 20) {
        insights.push('• High-intensity effort - consider longer recovery');
      } else if (hrReserve > 50) {
        insights.push('• Low-intensity effort - good for recovery or base building');
      } else {
        insights.push('• Moderate intensity - good for aerobic development');
      }
    }
    
    if (activity.duration > 3600) {
      insights.push('• Long duration activity - excellent for endurance building');
    }
    
    if (activity.trainingStressScore && activity.trainingStressScore > 300) {
      insights.push('• High training stress - ensure adequate recovery');
    }
    
    return insights.join('\n');
  }
  
  private groupActivitiesByType(activities: Activity[]): Record<string, Activity[]> {
    return activities.reduce((groups, activity) => {
      const type = activity.activityType || 'unknown';
      if (!groups[type]) {
        groups[type] = [];
      }
      groups[type].push(activity);
      return groups;
    }, {} as Record<string, Activity[]>);
  }
  
  private calculateAverage(numbers: (number | undefined)[]): number {
    const validNumbers = numbers.filter((n): n is number => n !== undefined);
    return validNumbers.length > 0 ? validNumbers.reduce((sum, n) => (sum || 0) + (n || 0), 0) / validNumbers.length : 0;
  }
  
  private analyzeWeeklyTrends(activities: Activity[]): string {
    const weeklyData = this.groupActivitiesByWeek(activities);
    
    if (weeklyData.length < 2) {
      return 'Not enough data for trend analysis.';
    }
    
    const trends = [];
    
    // Calculate week-over-week changes
    const currentWeek = weeklyData[0];
    const previousWeek = weeklyData[1];
    
    const distanceChange = ((currentWeek.totalDistance - previousWeek.totalDistance) / previousWeek.totalDistance) * 100;
    const durationChange = ((currentWeek.totalDuration - previousWeek.totalDuration) / previousWeek.totalDuration) * 100;
    
    trends.push(`**Distance trend:** ${distanceChange > 0 ? '+' : ''}${distanceChange.toFixed(1)}% vs last week`);
    trends.push(`**Duration trend:** ${durationChange > 0 ? '+' : ''}${durationChange.toFixed(1)}% vs last week`);
    
    if (Math.abs(distanceChange) > 10) {
      trends.push(distanceChange > 0 ? '• Increasing training volume' : '• Decreasing training volume');
    }
    
    return trends.join('\n');
  }
  
  private groupActivitiesByWeek(activities: Activity[]): Array<{
    week: number;
    totalDistance: number;
    totalDuration: number;
    activityCount: number;
  }> {
    const weeks = new Map<number, { totalDistance: number; totalDuration: number; activityCount: number }>();
    
    activities.forEach(activity => {
      const date = new Date(activity.startTimeLocal);
      const weekNumber = Math.floor(date.getTime() / (7 * 24 * 60 * 60 * 1000));
      
      if (!weeks.has(weekNumber)) {
        weeks.set(weekNumber, { totalDistance: 0, totalDuration: 0, activityCount: 0 });
      }
      
      const week = weeks.get(weekNumber)!;
      week.totalDistance += activity.distance || 0;
      week.totalDuration += activity.duration;
      week.activityCount++;
    });
    
    return Array.from(weeks.entries())
      .map(([week, data]) => ({ week, ...data }))
      .sort((a, b) => b.week - a.week);
  }
  
  private calculateTrainingLoad(activities: Activity[]): { score: number; category: string } {
    const scores = activities.map(a => a.trainingStressScore).filter((score): score is number => score !== undefined);
    const avgScore = scores.length > 0 ? scores.reduce((sum, s) => sum + s, 0) / scores.length : 0;
    
    return {
      score: avgScore,
      category: this.categorizeTrainingLoad(avgScore)
    };
  }
  
  private analyzeRecovery(healthMetrics: HealthMetrics): string {
    const recovery = [];
    
    if (healthMetrics.weight) {
      recovery.push(`**Weight:** ${healthMetrics.weight.toFixed(1)} lbs`);
    }
    
    if (healthMetrics.sleep) {
      const totalHours = healthMetrics.sleep.totalSleepTimeSeconds / 3600;
      recovery.push(`**Sleep:** ${totalHours.toFixed(1)} hours (${healthMetrics.sleep.sleepQualityTypeName})`);
      
      if (totalHours < 7) {
        recovery.push('• Consider getting more sleep for better recovery');
      }
    }
    
    if (healthMetrics.hydration) {
      recovery.push(`**Hydration:** ${healthMetrics.hydration.toFixed(1)} oz`);
      
      if (healthMetrics.hydration < 64) {
        recovery.push('• Consider increasing daily water intake');
      }
    }
    
    if (healthMetrics.restingHeartRate) {
      recovery.push(`**Resting Heart Rate:** ${healthMetrics.restingHeartRate} bpm`);
    }
    
    return recovery.join('\n');
  }
  
  private generateRunningAdvice(activities: Activity[], healthMetrics: HealthMetrics): string {
    const runningActivities = activities.filter(a => a.activityType === 'running');
    
    if (runningActivities.length === 0) {
      return '### Running:\n• No recent running activities found. Consider adding running to your routine for cardiovascular benefits.';
    }
    
    const advice = ['### Running:'];
    
    // Weekly mileage analysis
    const weeklyDistance = runningActivities.reduce((sum, a) => sum + (a.distance || 0), 0) / 1000;
    
    if (weeklyDistance < 20) {
      advice.push('• Consider gradually increasing weekly mileage for better endurance');
    } else if (weeklyDistance > 60) {
      advice.push('• High weekly mileage - ensure adequate recovery between runs');
    }
    
    // Pace analysis
    const avgPaces = runningActivities.map(a => a.averageSpeed).filter((speed): speed is number => speed !== undefined);
    if (avgPaces.length > 0) {
      const paceVariability = this.calculateVariability(avgPaces);
      if (paceVariability < 0.1) {
        advice.push('• Try varying your pace - include easy runs, tempo runs, and intervals');
      }
    }
    
    return advice.join('\n');
  }
  
  private generateCyclingAdvice(activities: Activity[], healthMetrics: HealthMetrics): string {
    const cyclingActivities = activities.filter(a => a.activityType === 'cycling');
    
    if (cyclingActivities.length === 0) {
      return '### Cycling:\n• No recent cycling activities found. Consider adding cycling for low-impact cardio.';
    }
    
    const advice = ['### Cycling:'];
    
    const avgDuration = cyclingActivities.reduce((sum, a) => sum + a.duration, 0) / cyclingActivities.length;
    
    if (avgDuration < 1800) { // 30 minutes
      advice.push('• Consider longer rides for better aerobic development');
    }
    
    return advice.join('\n');
  }
  
  private generateStrengthAdvice(activities: Activity[], healthMetrics: HealthMetrics): string {
    const strengthActivities = activities.filter(a => 
      a.activityType.includes('strength') || 
      a.activityType.includes('training') ||
      a.activityType.includes('gym')
    );
    
    const advice = ['### Strength Training:'];
    
    if (strengthActivities.length === 0) {
      advice.push('• No recent strength training found. Consider adding 2-3 strength sessions per week');
    } else if (strengthActivities.length < 2) {
      advice.push('• Try to include at least 2 strength sessions per week for optimal benefits');
    }
    
    return advice.join('\n');
  }
  
  private generateGeneralAdvice(activities: Activity[], healthMetrics: HealthMetrics): string {
    const advice = [];
    
    // Activity frequency
    const daysWithActivity = new Set(activities.map(a => new Date(a.startTimeLocal).toDateString())).size;
    const weeklyFrequency = (daysWithActivity / 14) * 7; // Assuming 14 days of data
    
    if (weeklyFrequency < 3) {
      advice.push('• Aim for at least 3-4 training sessions per week');
    } else if (weeklyFrequency > 6) {
      advice.push('• Consider adding at least one rest day per week');
    }
    
    // Recovery recommendations
    if (healthMetrics.restingHeartRate && healthMetrics.restingHeartRate > 60) {
      advice.push('• Elevated resting heart rate - consider more recovery time');
    }
    
    // Cross-training suggestions
    const activityTypes = new Set(activities.map(a => a.activityType));
    if (activityTypes.size === 1) {
      advice.push('• Consider adding cross-training activities to reduce injury risk');
    }
    
    return advice.join('\n');
  }
  
  private calculateVariability(values: number[]): number {
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    return Math.sqrt(variance) / mean;
  }
}

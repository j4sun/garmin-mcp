import pkg from 'garmin-connect';
const { GarminConnect } = pkg;

export interface Activity {
  activityId: string;
  activityName: string;
  activityType: string;
  startTimeLocal: string;
  duration: number;
  distance?: number;
  calories?: number;
  averageHeartRate?: number;
  maxHeartRate?: number;
  elevationGain?: number;
  averageSpeed?: number;
  maxSpeed?: number;
  averagePace?: number;
  trainingStressScore?: number;
  vo2MaxValue?: number;
}

export interface HealthMetrics {
  restingHeartRate?: number;
  steps?: number;
  sleep?: {
    totalSleepTimeSeconds: number;
    deepSleepSeconds: number;
    lightSleepSeconds: number;
    remSleepSeconds: number;
    sleepQualityTypeName: string;
  };
  weight?: number;
  hydration?: number;
  heartRate?: any;
}

export class GarminConnectClient {
  protected client: any;
  protected isAuthenticated = false;

  constructor() {
    this.client = new GarminConnect({
      username: '',
      password: '',
    });
  }

  async authenticate(username: string, password: string): Promise<void> {
    try {
      this.client = new GarminConnect({
        username,
        password,
      });
      
      await this.client.login();
      this.isAuthenticated = true;
    } catch (error) {
      this.isAuthenticated = false;
      throw new Error(`Authentication failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  protected ensureAuthenticated(): void {
    if (!this.isAuthenticated) {
      throw new Error('Not authenticated with Garmin Connect. Please authenticate first.');
    }
  }

  protected isLoginPageError(error: any): boolean {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return errorMessage.includes('login page') || 
           errorMessage.includes('Unexpected token') ||
           errorMessage.includes('not valid JSON') ||
           errorMessage.includes('HTML') ||
           errorMessage.toLowerCase().includes('unauthorized');
  }

  protected async handleApiCall<T>(apiCall: () => Promise<T>, operation: string): Promise<T> {
    try {
      return await apiCall();
    } catch (error) {
      if (this.isLoginPageError(error)) {
        this.isAuthenticated = false;
        throw new Error(`Authentication expired during ${operation}. Please re-authenticate with Garmin Connect.`);
      }
      throw error;
    }
  }

  async getActivities(days: number = 30, limit: number = 50): Promise<Activity[]> {
    this.ensureAuthenticated();
    
    return this.handleApiCall(async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      const activities = await this.client.getActivities(0, limit);
      
      return activities
        .filter((activity: any) => {
          const activityDate = new Date(activity.startTimeLocal);
          return activityDate >= startDate;
        })
        .map((activity: any) => ({
          activityId: activity.activityId?.toString() || '',
          activityName: activity.activityName || 'Unknown Activity',
          activityType: activity.activityType?.typeKey || 'unknown',
          startTimeLocal: activity.startTimeLocal,
          duration: activity.duration || 0,
          distance: activity.distance,
          calories: activity.calories,
          averageHeartRate: activity.averageHR,
          maxHeartRate: activity.maxHR,
          elevationGain: activity.elevationGain,
          averageSpeed: activity.averageSpeed,
          maxSpeed: activity.maxSpeed,
          averagePace: activity.averageSpeed,
          trainingStressScore: activity.trainingStressScore as number,
          vo2MaxValue: activity.vO2MaxValue as number,
        }));
    }, 'getting activities');
  }

  async getActivity(activityId: string): Promise<Activity> {
    this.ensureAuthenticated();
    
    try {
      const activity = await this.client.getActivity({
        activityId: parseInt(activityId),
      });
      
      return {
        activityId: activity.activityId?.toString() || '',
        activityName: activity.activityName || 'Unknown Activity',
        activityType: activity.activityType?.typeKey || 'unknown',
        startTimeLocal: activity.startTimeLocal,
        duration: activity.duration || 0,
        distance: activity.distance,
        calories: activity.calories,
        averageHeartRate: activity.averageHR,
        maxHeartRate: activity.maxHR,
        elevationGain: activity.elevationGain,
        averageSpeed: activity.averageSpeed,
        maxSpeed: activity.maxSpeed,
        averagePace: activity.averageSpeed,
        trainingStressScore: activity.trainingStressScore as number,
        vo2MaxValue: activity.vO2MaxValue as number,
      };
    } catch (error) {
      throw new Error(`Failed to get activity: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async getHealthMetrics(
    days: number = 14,
    startDate?: string,
    endDate?: string,
    metrics?: string[]
  ): Promise<HealthMetrics> {
    this.ensureAuthenticated();
    
    return this.handleApiCall(async () => {
      const healthData: HealthMetrics = {};
      
      // Get date range
      const end = endDate ? new Date(endDate) : new Date();
      const start = startDate ? new Date(startDate) : new Date(end.getTime() - days * 24 * 60 * 60 * 1000);
      
      // Validate dates
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        throw new Error('Invalid date format provided');
      }
      
      // Get heart rate data
      if (!metrics || metrics.includes('heartRate')) {
        try {
          const heartRateData = await this.client.getHeartRate(start);
          if (heartRateData) {
            healthData.heartRate = heartRateData;
            healthData.restingHeartRate = heartRateData.restingHeartRate;
          }
        } catch (error) {
          console.error('Failed to get heart rate data:', error);
        }
      }
      
      // Get steps data
      if (!metrics || metrics.includes('steps')) {
        try {
          const stepsData = await this.client.getSteps(start);
          if (stepsData) {
            healthData.steps = stepsData;
          }
        } catch (error) {
          console.error('Failed to get steps data:', error);
        }
      }
      
      // Get sleep data
      if (!metrics || metrics.includes('sleep')) {
        try {
          const sleepData = await this.client.getSleepData(start);
          console.log('Sleep data response:', JSON.stringify(sleepData, null, 2));
          if (sleepData && sleepData.dailySleepDTO) {
            const dailySleep = sleepData.dailySleepDTO;
            healthData.sleep = {
              totalSleepTimeSeconds: dailySleep.sleepTimeSeconds || 0,
              deepSleepSeconds: dailySleep.deepSleepSeconds || 0,
              lightSleepSeconds: dailySleep.lightSleepSeconds || 0,
              remSleepSeconds: dailySleep.remSleepSeconds || 0,
              sleepQualityTypeName: `Score: ${dailySleep.sleepScores?.overall?.value || 'N/A'}`,
            };
          } else {
            // Try alternative method - getSleepDuration
            try {
              const sleepDuration = await this.client.getSleepDuration(start);
              if (sleepDuration) {
                const totalMinutes = (parseInt(sleepDuration.hours || '0') * 60) + parseInt(sleepDuration.minutes || '0');
                healthData.sleep = {
                  totalSleepTimeSeconds: totalMinutes * 60,
                  deepSleepSeconds: 0,
                  lightSleepSeconds: 0,
                  remSleepSeconds: 0,
                  sleepQualityTypeName: 'Basic',
                };
              }
            } catch (durationError) {
              console.error('Failed to get sleep duration:', durationError);
              healthData.sleep = {
                totalSleepTimeSeconds: 0,
                deepSleepSeconds: 0,
                lightSleepSeconds: 0,
                remSleepSeconds: 0,
                sleepQualityTypeName: 'Unknown',
              };
            }
          }
        } catch (error) {
          console.error('Failed to get sleep data:', error);
          healthData.sleep = {
            totalSleepTimeSeconds: 0,
            deepSleepSeconds: 0,
            lightSleepSeconds: 0,
            remSleepSeconds: 0,
            sleepQualityTypeName: 'Unknown',
          };
        }
      }
      
      // Get weight data
      if (!metrics || metrics.includes('weight')) {
        try {
          const weightData = await this.client.getDailyWeightInPounds(start);
          if (weightData) {
            healthData.weight = weightData;
          }
        } catch (error) {
          console.error('Failed to get weight data:', error);
        }
      }
      
      // Get hydration data
      if (!metrics || metrics.includes('hydration')) {
        try {
          const hydrationData = await this.client.getDailyHydration(start);
          if (hydrationData) {
            healthData.hydration = hydrationData;
          }
        } catch (error) {
          console.error('Failed to get hydration data:', error);
        }
      }
      
      return healthData;
    }, 'getting health metrics');
  }
}

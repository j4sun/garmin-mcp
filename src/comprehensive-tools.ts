import { GarminConnectClient } from './garmin-client.js';

// Extended Garmin client with comprehensive data access
export class ComprehensiveGarminClient extends GarminConnectClient {
  
  // User Profile & Settings
  async getUserProfile(): Promise<any> {
    this.ensureAuthenticated();
    try {
      return await this.client.getUserProfile();
    } catch (error) {
      throw new Error(`Failed to get user profile: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async getUserSettings(): Promise<any> {
    this.ensureAuthenticated();
    try {
      return await this.client.getUserSettings();
    } catch (error) {
      throw new Error(`Failed to get user settings: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Workout Management
  async getWorkouts(start: number = 0, limit: number = 20): Promise<any[]> {
    this.ensureAuthenticated();
    try {
      return await this.client.getWorkouts(start, limit);
    } catch (error) {
      throw new Error(`Failed to get workouts: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async getWorkoutDetail(workoutId: string): Promise<any> {
    this.ensureAuthenticated();
    try {
      return await this.client.getWorkoutDetail({ workoutId });
    } catch (error) {
      throw new Error(`Failed to get workout detail: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async addRunningWorkout(name: string, distance: number, description: string): Promise<any> {
    this.ensureAuthenticated();
    try {
      return await this.client.addRunningWorkout(name, distance, description);
    } catch (error) {
      throw new Error(`Failed to add running workout: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async deleteWorkout(workoutId: string): Promise<void> {
    this.ensureAuthenticated();
    try {
      await this.client.deleteWorkout({ workoutId });
    } catch (error) {
      throw new Error(`Failed to delete workout: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Golf Data
  async getGolfSummary(): Promise<any> {
    this.ensureAuthenticated();
    try {
      return await this.client.getGolfSummary();
    } catch (error) {
      throw new Error(`Failed to get golf summary: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async getGolfScorecard(scorecardId: number): Promise<any> {
    this.ensureAuthenticated();
    try {
      return await this.client.getGolfScorecard(scorecardId);
    } catch (error) {
      throw new Error(`Failed to get golf scorecard: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Activity Management
  async countActivities(): Promise<any> {
    this.ensureAuthenticated();
    try {
      return await this.client.countActivities();
    } catch (error) {
      throw new Error(`Failed to count activities: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async uploadActivity(filePath: string): Promise<any> {
    this.ensureAuthenticated();
    try {
      return await this.client.uploadActivity(filePath);
    } catch (error) {
      throw new Error(`Failed to upload activity: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async deleteActivity(activityId: string): Promise<void> {
    this.ensureAuthenticated();
    try {
      await this.client.deleteActivity({ activityId: parseInt(activityId) });
    } catch (error) {
      throw new Error(`Failed to delete activity: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Health Data Updates
  async updateWeight(date: Date, weightLbs: number, timezone: string = 'America/Los_Angeles'): Promise<any> {
    this.ensureAuthenticated();
    try {
      return await this.client.updateWeight(date, weightLbs, timezone);
    } catch (error) {
      throw new Error(`Failed to update weight: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async updateHydration(date: Date, valueInOz: number): Promise<any> {
    this.ensureAuthenticated();
    try {
      return await this.client.updateHydrationLogOunces(date, valueInOz);
    } catch (error) {
      throw new Error(`Failed to update hydration: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Advanced Activity Data
  async getActivityDetails(activityId: string): Promise<any> {
    this.ensureAuthenticated();
    try {
      return await this.getActivity(activityId);
    } catch (error) {
      throw new Error(`Failed to get activity details: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Custom API Access
  async customGet(endpoint: string, params?: any): Promise<any> {
    this.ensureAuthenticated();
    try {
      return await this.client.get(endpoint, params);
    } catch (error) {
      throw new Error(`Failed to make custom GET request: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async customPost(endpoint: string, data: any): Promise<any> {
    this.ensureAuthenticated();
    try {
      return await this.client.post(endpoint, data);
    } catch (error) {
      throw new Error(`Failed to make custom POST request: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Make isAuthenticated accessible
  get authenticated(): boolean {
    return this.isAuthenticated;
  }
}

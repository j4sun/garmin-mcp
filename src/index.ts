#!/usr/bin/env node

import { config } from 'dotenv';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { GarminConnectClient } from './garmin-client.js';
import { ComprehensiveGarminClient } from './comprehensive-tools.js';
import { TrainingAnalyzer } from './training-analyzer.js';

// Load environment variables from the correct path
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

config({ path: join(projectRoot, '.env') });

// Debug environment variable loading
const envPath = join(projectRoot, '.env');
console.error(`📁 Loading .env from: ${envPath}`);
console.error(`🔐 Username configured: ${process.env.GARMIN_USERNAME ? 'Yes' : 'No'}`);
console.error(`🔐 Password configured: ${process.env.GARMIN_PASSWORD ? 'Yes' : 'No'}`);
console.error(`🔐 Auto-auth enabled: ${process.env.GARMIN_AUTO_AUTH}`);

// Schema definitions
const GetActivitiesSchema = z.object({
  days: z.number().optional().default(30),
  limit: z.number().optional().default(50),
});

const GetActivityInsightsSchema = z.object({
  activityId: z.string().optional(),
  days: z.number().optional().default(7),
});

const GetTrainingSuggestionsSchema = z.object({
  activityType: z.enum(['running', 'cycling', 'swimming', 'strength', 'all']).optional().default('all'),
  days: z.number().optional().default(14),
});

const GetHealthMetricsSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  metrics: z.array(z.enum(['heartRate', 'stress', 'sleep', 'bodyBattery', 'vo2Max'])).optional(),
});

class GarminMCPServer {
  private server: Server;
  private garminClient: ComprehensiveGarminClient;
  private analyzer: TrainingAnalyzer;

  constructor() {
    this.server = new Server(
      {
        name: 'garmin-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );
    
    this.garminClient = new ComprehensiveGarminClient();
    this.analyzer = new TrainingAnalyzer();
    
    this.setupToolHandlers();
    this.autoAuthenticate();
  }

  private async autoAuthenticate() {
    const username = process.env.GARMIN_USERNAME;
    const password = process.env.GARMIN_PASSWORD;
    const autoAuth = process.env.GARMIN_AUTO_AUTH?.toLowerCase() === 'true';
    
    if (username && password && autoAuth) {
      try {
        await this.garminClient.authenticate(username, password);
        console.error('🔐 Auto-authenticated with Garmin Connect');
      } catch (error) {
        console.error('❌ Auto-authentication failed:', error instanceof Error ? error.message : String(error));
      }
    }
  }

  private async handleAuthenticationError(operation: string): Promise<never> {
    const username = process.env.GARMIN_USERNAME;
    const password = process.env.GARMIN_PASSWORD;
    
    if (username && password) {
      try {
        console.error('🔄 Attempting to re-authenticate due to session expiry...');
        await this.garminClient.authenticate(username, password);
        throw new Error(`Authentication session expired during ${operation}. Please try your request again - you have been re-authenticated.`);
      } catch (authError) {
        throw new Error(`Authentication session expired and re-authentication failed during ${operation}. Please manually authenticate with Garmin Connect.`);
      }
    } else {
      throw new Error(`Authentication session expired during ${operation}. Please authenticate with Garmin Connect using your credentials.`);
    }
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'get_activities',
            description: 'Get recent activities from Garmin Connect',
            inputSchema: {
              type: 'object',
              properties: {
                days: {
                  type: 'number',
                  description: 'Number of days to look back (default: 30)',
                  default: 30,
                },
                limit: {
                  type: 'number',
                  description: 'Maximum number of activities to return (default: 50)',
                  default: 50,
                },
              },
            },
          },
          {
            name: 'get_activity_insights',
            description: 'Get detailed insights for a specific activity or recent activities',
            inputSchema: {
              type: 'object',
              properties: {
                activityId: {
                  type: 'string',
                  description: 'Specific activity ID to analyze (optional)',
                },
                days: {
                  type: 'number',
                  description: 'Number of days to analyze if no activity ID specified (default: 7)',
                  default: 7,
                },
              },
            },
          },
          {
            name: 'get_training_suggestions',
            description: 'Get AI-powered training suggestions based on recent activities and performance',
            inputSchema: {
              type: 'object',
              properties: {
                activityType: {
                  type: 'string',
                  enum: ['running', 'cycling', 'swimming', 'strength', 'all'],
                  description: 'Type of activity to focus suggestions on (default: all)',
                  default: 'all',
                },
                days: {
                  type: 'number',
                  description: 'Number of days of history to consider (default: 14)',
                  default: 14,
                },
              },
            },
          },
          {
            name: 'get_health_metrics',
            description: 'Get health and wellness metrics from Garmin Connect',
            inputSchema: {
              type: 'object',
              properties: {
                startDate: {
                  type: 'string',
                  description: 'Start date in YYYY-MM-DD format (optional)',
                },
                endDate: {
                  type: 'string',
                  description: 'End date in YYYY-MM-DD format (optional)',
                },
                metrics: {
                  type: 'array',
                  items: {
                    type: 'string',
                    enum: ['heartRate', 'stress', 'sleep', 'bodyBattery', 'vo2Max'],
                  },
                  description: 'Specific metrics to retrieve (optional)',
                },
              },
            },
          },
          {
            name: 'authenticate_garmin',
            description: 'Authenticate with Garmin Connect using username and password (can use environment variables)',
            inputSchema: {
              type: 'object',
              properties: {
                username: {
                  type: 'string',
                  description: 'Garmin Connect username (optional if GARMIN_USERNAME env var is set)',
                },
                password: {
                  type: 'string',
                  description: 'Garmin Connect password (optional if GARMIN_PASSWORD env var is set)',
                },
              },
              required: [],
            },
          },
          {
            name: 'get_user_profile',
            description: 'Get detailed user profile and settings from Garmin Connect',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
          {
            name: 'get_workouts',
            description: 'Get workout plans and schedules from Garmin Connect',
            inputSchema: {
              type: 'object',
              properties: {
                start: {
                  type: 'number',
                  description: 'Start index for pagination (default: 0)',
                  default: 0,
                },
                limit: {
                  type: 'number',
                  description: 'Number of workouts to return (default: 20)',
                  default: 20,
                },
              },
            },
          },
          {
            name: 'get_workout_detail',
            description: 'Get detailed information about a specific workout',
            inputSchema: {
              type: 'object',
              properties: {
                workoutId: {
                  type: 'string',
                  description: 'ID of the workout to get details for',
                },
              },
              required: ['workoutId'],
            },
          },
          {
            name: 'create_running_workout',
            description: 'Create a new running workout plan',
            inputSchema: {
              type: 'object',
              properties: {
                name: {
                  type: 'string',
                  description: 'Name of the workout',
                },
                distance: {
                  type: 'number',
                  description: 'Distance in meters',
                },
                description: {
                  type: 'string',
                  description: 'Description of the workout',
                },
              },
              required: ['name', 'distance', 'description'],
            },
          },
          {
            name: 'get_golf_data',
            description: 'Get golf performance data and scorecards',
            inputSchema: {
              type: 'object',
              properties: {
                scorecardId: {
                  type: 'number',
                  description: 'Specific scorecard ID to retrieve (optional)',
                },
              },
            },
          },
          {
            name: 'get_activity_stats',
            description: 'Get comprehensive activity statistics and counts',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
          {
            name: 'update_health_data',
            description: 'Update weight or hydration data in Garmin Connect',
            inputSchema: {
              type: 'object',
              properties: {
                type: {
                  type: 'string',
                  enum: ['weight', 'hydration'],
                  description: 'Type of data to update',
                },
                value: {
                  type: 'number',
                  description: 'Value to set (weight in lbs, hydration in oz)',
                },
                date: {
                  type: 'string',
                  description: 'Date in YYYY-MM-DD format (optional, defaults to today)',
                },
                timezone: {
                  type: 'string',
                  description: 'Timezone (optional, defaults to America/Los_Angeles)',
                },
              },
              required: ['type', 'value'],
            },
          },
          {
            name: 'manage_activities',
            description: 'Upload, delete, or modify activities',
            inputSchema: {
              type: 'object',
              properties: {
                action: {
                  type: 'string',
                  enum: ['upload', 'delete', 'count'],
                  description: 'Action to perform',
                },
                activityId: {
                  type: 'string',
                  description: 'Activity ID (required for delete action)',
                },
                filePath: {
                  type: 'string',
                  description: 'Path to activity file (required for upload action)',
                },
              },
              required: ['action'],
            },
          },
          {
            name: 'custom_garmin_request',
            description: 'Make custom API requests to Garmin Connect (advanced users)',
            inputSchema: {
              type: 'object',
              properties: {
                method: {
                  type: 'string',
                  enum: ['GET', 'POST'],
                  description: 'HTTP method',
                },
                endpoint: {
                  type: 'string',
                  description: 'API endpoint URL',
                },
                data: {
                  type: 'object',
                  description: 'Request data (for POST requests)',
                },
                params: {
                  type: 'object',
                  description: 'Query parameters (for GET requests)',
                },
              },
              required: ['method', 'endpoint'],
            },
          },
        ] as Tool[],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'authenticate_garmin':
            return await this.handleAuthenticate(args);
          case 'get_activities':
            return await this.handleGetActivities(args);
          case 'get_activity_insights':
            return await this.handleGetActivityInsights(args);
          case 'get_training_suggestions':
            return await this.handleGetTrainingSuggestions(args);
          case 'get_health_metrics':
            return await this.handleGetHealthMetrics(args);
          case 'get_user_profile':
            return await this.handleGetUserProfile(args);
          case 'get_workouts':
            return await this.handleGetWorkouts(args);
          case 'get_workout_detail':
            return await this.handleGetWorkoutDetail(args);
          case 'create_running_workout':
            return await this.handleCreateRunningWorkout(args);
          case 'get_golf_data':
            return await this.handleGetGolfData(args);
          case 'get_activity_stats':
            return await this.handleGetActivityStats(args);
          case 'update_health_data':
            return await this.handleUpdateHealthData(args);
          case 'manage_activities':
            return await this.handleManageActivities(args);
          case 'custom_garmin_request':
            return await this.handleCustomGarminRequest(args);
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    });
  }

  private async handleAuthenticate(args: any) {
    // Use provided credentials or fall back to environment variables
    const username = args.username || process.env.GARMIN_USERNAME;
    const password = args.password || process.env.GARMIN_PASSWORD;
    
    if (!username || !password) {
      throw new Error('Username and password are required. Provide them as arguments or set GARMIN_USERNAME and GARMIN_PASSWORD environment variables.');
    }
    
    await this.garminClient.authenticate(username, password);
    return {
      content: [
        {
          type: 'text',
          text: 'Successfully authenticated with Garmin Connect',
        },
      ],
    };
  }

  private async handleGetActivities(args: any) {
    const { days, limit } = GetActivitiesSchema.parse(args);
    const activities = await this.garminClient.getActivities(days, limit);
    
    return {
      content: [
        {
          type: 'text',
          text: this.sanitizeText(`Found ${activities.length} activities:\n\n${activities
            .map(
              (activity) =>
                `• ${activity.activityName} (${activity.activityType})\n` +
                `  Date: ${activity.startTimeLocal}\n` +
                `  Duration: ${Math.round(activity.duration / 60)} minutes\n` +
                `  Distance: ${activity.distance ? (activity.distance / 1000).toFixed(2) + ' km' : 'N/A'}\n`
            )
            .join('\n')}`),
        },
      ],
    };
  }

  private sanitizeText(text: string): string {
    if (typeof text !== 'string') {
      text = String(text);
    }
    
    return text
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, '') // Remove control characters (but keep \t and \n)
      .replace(/[\u200B-\u200D\uFEFF]/g, '') // Remove zero-width characters
      .replace(/[^\x09\x0A\x20-\x7E\u00A0-\uFFFF]/g, '') // Keep tab, newline, printable ASCII and unicode
      .replace(/\r\n/g, '\n') // Normalize line endings
      .replace(/\r/g, '\n') // Normalize line endings
      .trim();
  }

  private async handleGetActivityInsights(args: any) {
    const { activityId, days } = GetActivityInsightsSchema.parse(args);
    
    let insights;
    if (activityId) {
      try {
        const activity = await this.garminClient.getActivity(activityId);
        insights = await this.analyzer.analyzeActivity(activity);
      } catch (error) {
        if (error instanceof Error && error.message.includes('404')) {
          throw new Error(`Activity with ID ${activityId} not found. Please check the activity ID and ensure it belongs to your account.`);
        }
        throw error;
      }
    } else {
      const activities = await this.garminClient.getActivities(days, 20);
      insights = await this.analyzer.analyzeActivities(activities);
    }
    
    return {
      content: [
        {
          type: 'text',
          text: this.sanitizeText(insights),
        },
      ],
    };
  }

  private async handleGetTrainingSuggestions(args: any) {
    const { activityType, days } = GetTrainingSuggestionsSchema.parse(args);
    
    const activities = await this.garminClient.getActivities(days, 50);
    const healthMetrics = await this.garminClient.getHealthMetrics(days);
    
    const suggestions = await this.analyzer.generateTrainingSuggestions(
      activities,
      healthMetrics,
      activityType
    );
    
    return {
      content: [
        {
          type: 'text',
          text: this.sanitizeText(suggestions),
        },
      ],
    };
  }

  private async handleGetHealthMetrics(args: any) {
    const { startDate, endDate, metrics } = GetHealthMetricsSchema.parse(args);
    
    const healthData = await this.garminClient.getHealthMetrics(
      14, // default to 14 days if no date range specified
      startDate,
      endDate,
      metrics
    );
    
    return {
      content: [
        {
          type: 'text',
          text: this.sanitizeText(`Health Metrics Summary:\n\n${JSON.stringify(healthData, null, 2)}`),
        },
      ],
    };
  }

  private async handleGetUserProfile(args: any) {
    const profile = await this.garminClient.getUserProfile();
    const settings = await this.garminClient.getUserSettings();
    
    return {
      content: [
        {
          type: 'text',
          text: this.sanitizeText(`# User Profile\n\n**Name:** ${profile.fullName}\n**Username:** ${profile.userName}\n**Location:** ${profile.location}\n**Primary Activity:** ${profile.primaryActivity}\n\n## Settings\n\n**Measurement System:** ${settings.measurementSystemKey}\n**Time Zone:** ${settings.timeZoneGroupKey}\n**Date Format:** ${settings.dateFormatKey}\n\n## Profile Stats\n\n**Running Training Speed:** ${profile.runningTrainingSpeed} min/km\n**Cycling Training Speed:** ${profile.cyclingTrainingSpeed} km/h\n**Swimming Training Speed:** ${profile.swimmingTrainingSpeed} min/100m\n\n${JSON.stringify(profile, null, 2)}`),
        },
      ],
    };
  }

  private async handleGetWorkouts(args: any) {
    const { start = 0, limit = 20 } = args;
    const workouts = await this.garminClient.getWorkouts(start, limit);
    
    return {
      content: [
        {
          type: 'text',
          text: `# Workouts (${workouts.length})\n\n${workouts.map(workout => 
            `## ${workout.workoutName || 'Unnamed Workout'}\n**Type:** ${workout.sportType?.sportTypeKey || workout.sport?.sportTypeKey || workout.sportType || workout.sport || 'Unknown'}\n**Created:** ${workout.createdDate || workout.updatedDate || 'Unknown'}\n**ID:** ${workout.workoutId}\n`
          ).join('\n')}\n\n${JSON.stringify(workouts, null, 2)}`,
        },
      ],
    };
  }

  private async handleGetWorkoutDetail(args: any) {
    const { workoutId } = args;
    const workout = await this.garminClient.getWorkoutDetail(workoutId);
    
    return {
      content: [
        {
          type: 'text',
          text: `# Workout Details: ${workout.workoutName || 'Unnamed Workout'}\n\n**Sport:** ${workout.sportType?.sportTypeKey || workout.sport?.sportTypeKey || workout.sportType || workout.sport || 'Unknown'}\n**Description:** ${workout.description || 'No description'}\n**Steps:** ${workout.workoutSteps?.length || workout.steps?.length || 0}\n\n${JSON.stringify(workout, null, 2)}`,
        },
      ],
    };
  }

  private async handleCreateRunningWorkout(args: any) {
    const { name, distance, description } = args;
    const workout = await this.garminClient.addRunningWorkout(name, distance, description);
    
    return {
      content: [
        {
          type: 'text',
          text: `# Running Workout Created\n\n**Name:** ${name}\n**Distance:** ${distance}m\n**Description:** ${description}\n\n**Workout ID:** ${workout.workoutId}\n\n${JSON.stringify(workout, null, 2)}`,
        },
      ],
    };
  }

  private async handleGetGolfData(args: any) {
    const { scorecardId } = args;
    
    if (scorecardId) {
      const scorecard = await this.garminClient.getGolfScorecard(scorecardId);
      return {
        content: [
          {
            type: 'text',
            text: `# Golf Scorecard\n\n**Course:** ${scorecard.courseName || scorecard.course || 'Unknown Course'}\n**Date:** ${scorecard.playedDate || scorecard.date || 'Unknown Date'}\n**Score:** ${scorecard.totalScore || scorecard.score || 'N/A'}\n**Handicap:** ${scorecard.handicap || scorecard.playerHandicap || 'N/A'}\n\n${JSON.stringify(scorecard, null, 2)}`,
          },
        ],
      };
    } else {
      const summary = await this.garminClient.getGolfSummary();
      return {
        content: [
          {
            type: 'text',
            text: `# Golf Summary\n\n**Total Rounds:** ${summary.totalRounds || summary.rounds || 'N/A'}\n**Average Score:** ${summary.averageScore || summary.avgScore || 'N/A'}\n**Best Score:** ${summary.bestScore || summary.bestRound || 'N/A'}\n**Handicap:** ${summary.handicap || summary.currentHandicap || 'N/A'}\n\n${JSON.stringify(summary, null, 2)}`,
          },
        ],
      };
    }
  }

  private async handleGetActivityStats(args: any) {
    const stats = await this.garminClient.countActivities();
    
    return {
      content: [
        {
          type: 'text',
          text: `# Activity Statistics\n\n**Total Activities:** ${stats.totalActivities || stats.total || stats.count || (typeof stats === 'number' ? stats : 'N/A')}\n**This Year:** ${stats.thisYear || stats.year || stats.currentYear || 'N/A'}\n**This Month:** ${stats.thisMonth || stats.month || stats.currentMonth || 'N/A'}\n**This Week:** ${stats.thisWeek || stats.week || stats.currentWeek || 'N/A'}\n\n${JSON.stringify(stats, null, 2)}`,
        },
      ],
    };
  }

  private async handleUpdateHealthData(args: any) {
    const { type, value, date, timezone } = args;
    const targetDate = date ? new Date(date) : new Date();
    
    let result;
    if (type === 'weight') {
      result = await this.garminClient.updateWeight(targetDate, value, timezone);
    } else if (type === 'hydration') {
      result = await this.garminClient.updateHydration(targetDate, value);
    }
    
    return {
      content: [
        {
          type: 'text',
          text: `# ${type.charAt(0).toUpperCase() + type.slice(1)} Updated\n\n**Date:** ${targetDate.toISOString().split('T')[0]}\n**Value:** ${value} ${type === 'weight' ? 'lbs' : 'oz'}\n\n${JSON.stringify(result, null, 2)}`,
        },
      ],
    };
  }

  private async handleManageActivities(args: any) {
    const { action, activityId, filePath } = args;
    
    if (action === 'count') {
      const stats = await this.garminClient.countActivities();
      return {
        content: [
          {
            type: 'text',
            text: `# Activity Count\n\n**Total:** ${stats.totalActivities || stats.total || stats.count || (typeof stats === 'number' ? stats : 'N/A')}\n\n${JSON.stringify(stats, null, 2)}`,
          },
        ],
      };
    } else if (action === 'delete' && activityId) {
      await this.garminClient.deleteActivity(activityId);
      return {
        content: [
          {
            type: 'text',
            text: `# Activity Deleted\n\n**Activity ID:** ${activityId}`,
          },
        ],
      };
    } else if (action === 'upload' && filePath) {
      const result = await this.garminClient.uploadActivity(filePath);
      return {
        content: [
          {
            type: 'text',
            text: `# Activity Uploaded\n\n**File:** ${filePath}\n\n${JSON.stringify(result, null, 2)}`,
          },
        ],
      };
    }
    
    throw new Error('Invalid action or missing parameters');
  }

  private async handleCustomGarminRequest(args: any) {
    const { method, endpoint, data, params } = args;
    
    let result;
    if (method === 'GET') {
      result = await this.garminClient.customGet(endpoint, params);
    } else if (method === 'POST') {
      result = await this.garminClient.customPost(endpoint, data);
    }
    
    return {
      content: [
        {
          type: 'text',
          text: `# Custom ${method} Request\n\n**Endpoint:** ${endpoint}\n\n${JSON.stringify(result, null, 2)}`,
        },
      ],
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Garmin MCP server running on stdio');
  }
}

const server = new GarminMCPServer();
server.run().catch(console.error);

// Session Data Processor
// Processes live user session data from Fantasy402 for user behavior analysis

import type { Env } from '../types/cloudflare';

export interface UserSession {
    loginID: string;
    ipAddress: string;
    sessionId?: string;
    timestamp: string;
    location?: {
        country: string;
        region: string;
        city: string;
    };
    riskLevel: 'low' | 'medium' | 'high';
    patterns: {
        isMultiSession: boolean;
        isSharedIP: boolean;
        isVPN: boolean;
        isProxy: boolean;
    };
}

export interface SessionAnalysis {
    totalSessions: number;
    uniqueUsers: number;
    uniqueIPs: number;
    multiSessionUsers: string[];
    sharedIPUsers: Map<string, string[]>;
    riskUsers: UserSession[];
    geographicDistribution: Map<string, number>;
    networkAnalysis: {
        vpnDetected: number;
        proxyDetected: number;
        suspiciousPatterns: number;
    };
    topUsers: Array<{
        loginID: string;
        sessionCount: number;
        ipCount: number;
    }>;
}

export class SessionProcessor {
    private env: Env;
    private requestId: string;
    private sessionCache: Map<string, UserSession[]> = new Map();

    constructor(env: Env, requestId: string) {
        this.env = env;
        this.requestId = requestId;
    }

    // Process session data from Fantasy402
    async processSessionData(sessionData: any[]): Promise<SessionAnalysis> {
        console.log(`[${this.requestId}] 👥 Processing ${sessionData.length} user sessions`);

        const sessions = this.parseSessions(sessionData);
        const analysis = this.analyzeSessions(sessions);

        // Store processed data
        await this.storeSessionData(sessions, analysis);

        return analysis;
    }

    // Parse session data from Fantasy402 format
    private parseSessions(sessionData: any[]): UserSession[] {
        return sessionData.map(session => {
            const loginID = session.LoginID?.trim() || '';
            const ipAddress = session.IPAddress || '';
            const timestamp = new Date(Date.now()).toISOString();

            return {
                loginID,
                ipAddress,
                sessionId: this.generateSessionId(loginID, ipAddress),
                timestamp,
                location: this.analyzeIPLocation(ipAddress),
                riskLevel: this.assessRiskLevel(loginID, ipAddress),
                patterns: this.analyzePatterns(loginID, ipAddress)
            };
        });
    }

    // Generate unique session ID
    private generateSessionId(loginID: string, ipAddress: string): string {
        return `${loginID}-${ipAddress}-${Date.now()}`;
    }

    // Analyze IP location (mock implementation)
    private analyzeIPLocation(ipAddress: string): { country: string; region: string; city: string } {
        // In a real implementation, you'd use a geolocation service
        // For now, we'll analyze IP patterns
        if (ipAddress.startsWith('100.')) {
            return { country: 'US', region: 'Cloud', city: 'Unknown' };
        }
        if (ipAddress.startsWith('104.28.')) {
            return { country: 'US', region: 'Cloudflare', city: 'CDN' };
        }
        if (ipAddress.startsWith('102.')) {
            return { country: 'US', region: 'Cloud', city: 'Unknown' };
        }
        if (ipAddress.startsWith('103.')) {
            return { country: 'US', region: 'Cloud', city: 'Unknown' };
        }
        return { country: 'Unknown', region: 'Unknown', city: 'Unknown' };
    }

    // Assess risk level for user session
    private assessRiskLevel(loginID: string, ipAddress: string): 'low' | 'medium' | 'high' {
        let riskScore = 0;

        // Check for suspicious patterns
        if (this.isVPN(ipAddress)) riskScore += 3;
        if (this.isProxy(ipAddress)) riskScore += 2;
        if (this.isSharedIP(ipAddress)) riskScore += 1;
        if (this.isMultiSession(loginID)) riskScore += 2;

        // Check for known suspicious users
        if (this.isSuspiciousUser(loginID)) riskScore += 3;

        if (riskScore >= 5) return 'high';
        if (riskScore >= 2) return 'medium';
        return 'low';
    }

    // Analyze user patterns
    private analyzePatterns(loginID: string, ipAddress: string): {
        isMultiSession: boolean;
        isSharedIP: boolean;
        isVPN: boolean;
        isProxy: boolean;
    } {
        return {
            isMultiSession: this.isMultiSession(loginID),
            isSharedIP: this.isSharedIP(ipAddress),
            isVPN: this.isVPN(ipAddress),
            isProxy: this.isProxy(ipAddress)
        };
    }

    // Check if user has multiple sessions
    private isMultiSession(loginID: string): boolean {
        // This would check against stored session data
        // For now, we'll use a simple heuristic
        return loginID.includes('_0') || loginID.includes('_1') || loginID.includes('_2');
    }

    // Check if IP is shared by multiple users
    private isSharedIP(ipAddress: string): boolean {
        // Check if IP appears multiple times in the data
        // This would be calculated from the full dataset
        return ipAddress.startsWith('104.28.') || ipAddress.startsWith('100.');
    }

    // Check if IP is VPN
    private isVPN(ipAddress: string): boolean {
        // Known VPN/proxy IP ranges
        const vpnRanges = [
            '100.0.', '100.1.', '100.2.', '100.3.', '100.4.', '100.5.',
            '100.6.', '100.7.', '100.8.', '100.9.', '100.10.', '100.11.',
            '100.12.', '100.13.', '100.14.', '100.15.', '100.16.', '100.17.',
            '100.18.', '100.19.', '100.20.', '100.21.', '100.22.', '100.23.',
            '100.24.', '100.25.', '100.26.', '100.27.', '100.28.', '100.29.',
            '100.30.', '100.31.', '100.32.', '100.33.', '100.34.', '100.35.',
            '100.36.', '100.37.', '100.38.', '100.39.', '100.40.', '100.41.',
            '100.42.', '100.43.'
        ];

        return vpnRanges.some(range => ipAddress.startsWith(range));
    }

    // Check if IP is proxy
    private isProxy(ipAddress: string): boolean {
        // Known proxy IP ranges
        const proxyRanges = [
            '104.28.', '104.29.', '104.30.', '104.31.',
            '102.129.', '102.130.', '102.131.', '102.132.',
            '103.110.', '103.111.', '103.112.', '103.113.'
        ];

        return proxyRanges.some(range => ipAddress.startsWith(range));
    }

    // Check if user is suspicious
    private isSuspiciousUser(loginID: string): boolean {
        // Known suspicious patterns
        const suspiciousPatterns = [
            'WRC64818', 'SHARPCHED', 'COOPER012', 'OAKGAT100',
            'SHRPCOOPHR', 'NIPS112', 'BP1069', 'CM310'
        ];

        return suspiciousPatterns.includes(loginID);
    }

    // Analyze all sessions
    private analyzeSessions(sessions: UserSession[]): SessionAnalysis {
        const totalSessions = sessions.length;
        const uniqueUsers = new Set(sessions.map(s => s.loginID)).size;
        const uniqueIPs = new Set(sessions.map(s => s.ipAddress)).size;

        // Find multi-session users
        const userSessionCounts = new Map<string, number>();
        sessions.forEach(session => {
            const count = userSessionCounts.get(session.loginID) || 0;
            userSessionCounts.set(session.loginID, count + 1);
        });
        const multiSessionUsers = Array.from(userSessionCounts.entries())
            .filter(([_, count]) => count > 1)
            .map(([user, _]) => user);

        // Find shared IP users
        const sharedIPUsers = new Map<string, string[]>();
        const ipUserMap = new Map<string, string[]>();
        sessions.forEach(session => {
            const users = ipUserMap.get(session.ipAddress) || [];
            users.push(session.loginID);
            ipUserMap.set(session.ipAddress, users);
        });
        ipUserMap.forEach((users, ip) => {
            if (users.length > 1) {
                sharedIPUsers.set(ip, users);
            }
        });

        // Find risk users
        const riskUsers = sessions.filter(session =>
            session.riskLevel === 'high' || session.riskLevel === 'medium'
        );

        // Geographic distribution
        const geographicDistribution = new Map<string, number>();
        sessions.forEach(session => {
            const country = session.location?.country || 'Unknown';
            const count = geographicDistribution.get(country) || 0;
            geographicDistribution.set(country, count + 1);
        });

        // Network analysis
        const vpnDetected = sessions.filter(s => s.patterns.isVPN).length;
        const proxyDetected = sessions.filter(s => s.patterns.isProxy).length;
        const suspiciousPatterns = sessions.filter(s => s.riskLevel === 'high').length;

        // Top users by session count
        const topUsers = Array.from(userSessionCounts.entries())
            .map(([loginID, sessionCount]) => {
                const userIPs = new Set(sessions.filter(s => s.loginID === loginID).map(s => s.ipAddress));
                return {
                    loginID,
                    sessionCount,
                    ipCount: userIPs.size
                };
            })
            .sort((a, b) => b.sessionCount - a.sessionCount)
            .slice(0, 10);

        return {
            totalSessions,
            uniqueUsers,
            uniqueIPs,
            multiSessionUsers,
            sharedIPUsers,
            riskUsers,
            geographicDistribution,
            networkAnalysis: {
                vpnDetected,
                proxyDetected,
                suspiciousPatterns
            },
            topUsers
        };
    }

    // Store processed session data
    private async storeSessionData(sessions: UserSession[], analysis: SessionAnalysis): Promise<void> {
        try {
            const sessionData = {
                sessions,
                analysis,
                timestamp: new Date(Date.now()).toISOString(),
                requestId: this.requestId
            };

            await this.env.FANTASY_CACHE.put(
                'sessions:processed',
                JSON.stringify(sessionData),
                { expirationTtl: 24 * 60 * 60 } // 24 hours
            );

            // Store in Analytics Engine
            await this.env.ANALYTICS_ENGINE.writeDataPoint({
                blobs: [
                    'sessions_processed',
                    this.requestId,
                    `users_${analysis.uniqueUsers}`
                ],
                doubles: [
                    analysis.totalSessions,
                    analysis.uniqueUsers,
                    analysis.networkAnalysis.vpnDetected
                ],
                indexes: [`sessions-${this.requestId}`]
            });

            console.log(`[${this.requestId}] ✅ Stored ${sessions.length} user sessions`);
        } catch (error) {
            console.error(`[${this.requestId}] ❌ Error storing session data:`, error);
        }
    }

    // Get processed session data
    async getProcessedSessions(): Promise<any> {
        try {
            const data = await this.env.FANTASY_CACHE.get('sessions:processed');
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error(`[${this.requestId}] ❌ Error getting session data:`, error);
            return null;
        }
    }

    // Get risk users
    async getRiskUsers(): Promise<UserSession[]> {
        const data = await this.getProcessedSessions();
        if (!data) return [];

        return data.sessions.filter((session: UserSession) =>
            session.riskLevel === 'high' || session.riskLevel === 'medium'
        );
    }

    // Get user session history
    async getUserHistory(loginID: string): Promise<UserSession[]> {
        const data = await this.getProcessedSessions();
        if (!data) return [];

        return data.sessions.filter((session: UserSession) =>
            session.loginID === loginID
        );
    }
}

# Security and Privacy Compliance Plan

## Overview
Security and privacy considerations for the owner-only real-time active user analytics system.

## 1. Authentication & Authorization

### 1.1 Role-Based Access Control (RBAC)
**Current System:** Uses `profiles.role` field with values: 'owner', 'admin', 'user'

**Implementation:**
```sql
-- RLS Policy for active_sessions table
CREATE POLICY "owners_read_all_sessions"
  ON public.active_sessions FOR SELECT
  TO authenticated
  USING (public.is_owner(auth.uid()));

-- is_owner() function
CREATE OR REPLACE FUNCTION public.is_owner(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _user_id AND role = 'owner'
  )
$$;
```

**Verification Checklist:**
- [ ] Only users with `role = 'owner'` can read `active_sessions` table
- [ ] Non-owners cannot access active users data via API
- [ ] Frontend checks user role before displaying analytics
- [ ] Backend validates ownership on every request

### 1.2 Session Ownership
**Principle:** Users can only manage their own sessions

**Implementation:**
```sql
CREATE POLICY "users_manage_own_sessions"
  ON public.active_sessions FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

**Verification:**
- [ ] Users can only insert/update/delete their own sessions
- [ ] Session IDs are validated against user ID
- [ ] No user can manipulate another user's session

## 2. Data Privacy

### 2.1 Personally Identifiable Information (PII)
**Data Collected:**
- User ID (UUID)
- Session ID (random UUID)
- Timestamps (created_at, last_heartbeat)
- User Agent string
- IP address (optional)

**PII Protection:**
1. **No sensitive data**: No names, emails, or personal details in session table
2. **Aggregation**: Analytics show aggregate counts, not individual tracking
3. **Data minimization**: Only collect necessary data for functionality

### 2.2 Data Retention
**Retention Policy:**
- **Active sessions**: Kept while active (last_heartbeat < 5 minutes ago)
- **Stale sessions**: Automatically deleted by cleanup job
- **No long-term storage**: Sessions not archived or stored long-term

**Implementation:**
```sql
-- Cleanup removes sessions older than 5 minutes
DELETE FROM active_sessions
WHERE last_heartbeat < now() - interval '5 minutes';
```

### 2.3 Data Access Logging
**Audit Trail:**
```sql
-- Create audit log table
CREATE TABLE IF NOT EXISTS public.analytics_access_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  action text NOT NULL,
  resource text NOT NULL,
  accessed_at timestamptz NOT NULL DEFAULT now(),
  ip_address inet,
  user_agent text
);

-- Log owner access to analytics
CREATE OR REPLACE FUNCTION log_analytics_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF public.is_owner(auth.uid()) THEN
    INSERT INTO public.analytics_access_log (user_id, action, resource, ip_address, user_agent)
    VALUES (auth.uid(), TG_OP, TG_TABLE_NAME, inet_client_addr(), current_setting('request.headers', true)::json->>'user-agent');
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger on active_sessions SELECT
CREATE TRIGGER log_active_sessions_access
  AFTER SELECT ON public.active_sessions
  FOR EACH STATEMENT
  EXECUTE FUNCTION log_analytics_access();
```

## 3. API Security

### 3.1 Rate Limiting
**Heartbeat Endpoint:**
- Maximum: 1 request per 20 seconds per user
- Burst: Allow 3 rapid requests for reconnection scenarios

**Implementation Options:**
1. **Database-level rate limiting**: Track request timestamps
2. **Application-level rate limiting**: Use middleware
3. **Edge Function rate limiting**: Supabase Edge Functions with Redis

**Example Implementation:**
```sql
-- Rate limiting function
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_user_id uuid,
  p_endpoint text,
  p_window interval DEFAULT '20 seconds',
  p_max_requests integer DEFAULT 3
) RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  request_count integer;
BEGIN
  SELECT COUNT(*) INTO request_count
  FROM public.api_rate_limits
  WHERE user_id = p_user_id
    AND endpoint = p_endpoint
    AND requested_at > now() - p_window;
    
  RETURN request_count < p_max_requests;
END;
$$;
```

### 3.2 Input Validation
**Heartbeat Input Validation:**
```typescript
// Frontend validation
function validateHeartbeatInput(userId: string, sessionId: string): boolean {
  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(userId) && uuidRegex.test(sessionId);
}

// Backend validation
CREATE OR REPLACE FUNCTION update_user_session(
  p_user_id uuid,
  p_session_id text,
  p_user_agent text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Validate input
  IF p_user_id IS NULL OR p_session_id IS NULL THEN
    RAISE EXCEPTION 'User ID and Session ID are required';
  END IF;
  
  -- Validate session ID format (basic)
  IF length(p_session_id) > 255 THEN
    RAISE EXCEPTION 'Session ID too long';
  END IF;
  
  -- Continue with update...
END;
$$;
```

### 3.3 SQL Injection Prevention
**Measures:**
1. **Use RPC functions**: All database access through defined functions
2. **Parameterized queries**: Never concatenate SQL strings
3. **Least privilege**: Database users have minimal permissions

**Example Safe Implementation:**
```typescript
// SAFE: Using Supabase RPC
await supabase.rpc('update_user_session', {
  p_user_id: userId,
  p_session_id: sessionId
});

// UNSAFE: String concatenation (NEVER DO THIS)
await supabase.from('active_sessions')
  .upsert(`user_id = '${userId}', session_id = '${sessionId}'`); // VULNERABLE!
```

## 4. Network Security

### 4.1 HTTPS Enforcement
**Requirements:**
- All API calls use HTTPS
- Supabase connection uses SSL
- Frontend served over HTTPS

**Verification:**
```typescript
// Check if using HTTPS
const isSecure = window.location.protocol === 'https:';
if (!isSecure && process.env.NODE_ENV === 'production') {
  console.error('Insecure connection detected');
}
```

### 4.2 CORS Configuration
**Supabase CORS Settings:**
- Allow only specific origins (your domain)
- No wildcard origins
- Appropriate headers for authentication

**Configuration:**
```toml
# In Supabase dashboard or config
[cors]
allowed_origins = ["https://yourdomain.com", "https://app.yourdomain.com"]
allowed_methods = ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
allowed_headers = ["Authorization", "Content-Type"]
allow_credentials = true
```

### 4.3 WebSocket Security (Real-time)
**Supabase Realtime Security:**
- Authenticated channels only
- Row Level Security applies to real-time updates
- No sensitive data in broadcast messages

## 5. Privacy Compliance

### 5.1 GDPR Compliance
**User Rights:**
1. **Right to Access**: Users can request their session data
2. **Right to Deletion**: Users can request deletion of their data
3. **Data Portability**: Users can export their data

**Implementation:**
```sql
-- Function to get user's own session data
CREATE OR REPLACE FUNCTION get_my_sessions()
RETURNS TABLE (
  session_id text,
  created_at timestamptz,
  last_heartbeat timestamptz,
  user_agent text
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT session_id, created_at, last_heartbeat, user_agent
  FROM public.active_sessions
  WHERE user_id = auth.uid()
  ORDER BY last_heartbeat DESC;
$$;

-- Function to delete user's sessions
CREATE OR REPLACE FUNCTION delete_my_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.active_sessions
  WHERE user_id = auth.uid();
END;
$$;
```

### 5.2 Privacy Policy Updates
**Required Updates:**
1. **Data Collection**: Describe session tracking
2. **Purpose**: Explain why data is collected (analytics, security)
3. **Retention**: Explain data retention period
4. **User Rights**: Explain how users can access/delete data

**Sample Privacy Policy Addition:**
```
Session Tracking: We track user sessions to provide real-time analytics to platform owners. This includes session IDs, timestamps, and browser information. Sessions are automatically deleted after 5 minutes of inactivity. Users can request deletion of their session data at any time.
```

### 5.3 Cookie Consent
**Requirements:**
- Inform users about tracking
- Obtain consent where required
- Provide opt-out mechanism

**Implementation:**
```typescript
// Check cookie consent before starting heartbeat
function shouldStartHeartbeat(): boolean {
  const consent = getCookieConsent();
  return consent?.analytics === true;
}

// Only start heartbeat if consented
if (shouldStartHeartbeat()) {
  heartbeatService.start(userId);
}
```

## 6. Security Monitoring

### 6.1 Anomaly Detection
**Suspicious Activity Patterns:**
1. **Rapid heartbeats**: >10 requests per minute from single user
2. **Multiple sessions**: User with >5 concurrent sessions
3. **Suspicious user agents**: Known bot/crawler signatures

**Detection Implementation:**
```sql
-- Function to detect suspicious activity
CREATE OR REPLACE FUNCTION detect_suspicious_activity()
RETURNS TABLE (
  user_id uuid,
  issue text,
  severity text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  -- Rapid heartbeats
  SELECT a.user_id, 'Rapid heartbeats detected' as issue, 'high' as severity
  FROM public.active_sessions a
  WHERE a.last_heartbeat > now() - interval '1 minute'
  GROUP BY a.user_id
  HAVING COUNT(*) > 10
  
  UNION ALL
  
  -- Multiple concurrent sessions
  SELECT user_id, 'Multiple concurrent sessions' as issue, 'medium' as severity
  FROM public.active_sessions
  WHERE last_heartbeat > now() - interval '2 minutes'
  GROUP BY user_id
  HAVING COUNT(DISTINCT session_id) > 5;
END;
$$;
```

### 6.2 Security Logging
**Log Categories:**
1. **Authentication events**: Login/logout, session creation
2. **Authorization failures**: Attempted unauthorized access
3. **Rate limit hits**: Excessive request attempts
4. **Anomaly detections**: Suspicious activity patterns

**Log Storage:**
- Store in separate `security_logs` table
- Regular review by security team
- Automated alerting for critical events

## 7. Compliance Documentation

### 7.1 Security Assessment
**Required Documentation:**
1. **Threat Model**: Identify potential threats and mitigations
2. **Data Flow Diagram**: Show how data moves through system
3. **Risk Assessment**: Evaluate and prioritize risks
4. **Mitigation Plan**: Document security controls

### 7.2 Privacy Impact Assessment (PIA)
**Assessment Areas:**
1. **Data Collection**: What data is collected and why
2. **Data Processing**: How data is processed and stored
3. **Data Sharing**: Who has access to the data
4. **User Rights**: How user rights are protected

### 7.3 Incident Response Plan
**Response Steps:**
1. **Detection**: Identify security incident
2. **Containment**: Limit impact of incident
3. **Eradication**: Remove cause of incident
4. **Recovery**: Restore normal operations
5. **Lessons Learned**: Improve security posture

## 8. Testing & Validation

### 8.1 Security Testing
**Test Types:**
1. **Penetration Testing**: Attempt to bypass security controls
2. **Vulnerability Scanning**: Automated security scanning
3. **Code Review**: Manual review of security-critical code
4. **Dependency Scanning**: Check for vulnerable dependencies

**Tools:**
- OWASP ZAP for penetration testing
- Snyk for dependency scanning
- SonarQube for code quality
- Supabase Security Advisor for database security

### 8.2 Compliance Testing
**Test Scenarios:**
1. **Unauthorized Access**: Non-owner attempts to access analytics
2. **Data Deletion**: User requests data deletion
3. **Rate Limiting**: Test rate limit enforcement
4. **Input Validation**: Test malicious input handling

## 9. Implementation Checklist

### 9.1 Pre-Deployment Checks
- [ ] RLS policies tested and verified
- [ ] Rate limiting implemented
- [ ] Input validation in place
- [ ] Privacy policy updated
- [ ] Security logging configured
- [ ] Compliance documentation complete

### 9.2 Post-Deployment Monitoring
- [ ] Security logs being reviewed
- [ ] Anomaly detection running
- [ ] Performance monitoring active
- [ ] User feedback collected
- [ ] Regular security reviews scheduled

### 9.3 Ongoing Maintenance
- [ ] Regular security updates applied
- [ ] Dependency vulnerabilities addressed
- [ ] Security testing performed quarterly
- [ ] Compliance documentation updated annually
- [ ] Incident response plan tested biannually

## 10. Risk Mitigation Matrix

| Risk | Likelihood | Impact | Mitigation |
|------|------------|---------|------------|
| Unauthorized access to analytics | Low | High | RLS policies, role validation |
| Data leakage | Medium | High | Data minimization, encryption |
| Denial of service | Medium | Medium | Rate limiting, monitoring |
| Privacy violation | Low | High | Privacy controls, user consent |
| Session hijacking | Low | High | Secure session management |

## 11. Emergency Response

### 11.1 Security Incident
**Immediate Actions:**
1. Disable affected functionality if necessary
2. Investigate root cause
3. Notify affected users if required
4. Implement fixes
5. Restore service

### 11.2 Privacy Breach
**Response Steps:**
1. Contain the breach
2. Assess impact
3. Notify authorities if required
4. Notify affected individuals
5. Implement preventive measures

## 12. Training & Awareness

### 12.1 Developer Training
- Secure coding practices
- Privacy by design principles
- Incident response procedures

### 12.2 Owner Training
- Responsible use of analytics
- Data protection responsibilities
- Incident reporting procedures

## Conclusion
This security and privacy compliance plan provides a comprehensive framework for implementing the owner-only analytics system securely and in compliance with privacy regulations. Regular review and updates are essential to maintain security as the system evolves.
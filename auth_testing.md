# Auth-Gated App Testing Playbook (AI Career Mentor)

## Step 1: Create Test User & Session (mongosh)
```
mongosh --eval "
use('test_database');
var userId = 'test-user-' + Date.now();
var sessionToken = 'test_session_' + Date.now();
db.users.insertOne({
  user_id: userId,
  email: 'test.user.' + Date.now() + '@example.com',
  name: 'Test Mentee',
  picture: 'https://via.placeholder.com/150',
  onboarded: false,
  created_at: new Date()
});
db.user_sessions.insertOne({
  user_id: userId,
  session_token: sessionToken,
  expires_at: new Date(Date.now() + 7*24*60*60*1000),
  created_at: new Date()
});
print('Session token: ' + sessionToken);
print('User ID: ' + userId);
"
```

## Step 2: Test Backend
```
# /api/auth/me
curl -X GET "$BACKEND/api/auth/me" -H "Authorization: Bearer YOUR_SESSION_TOKEN"

# onboarding (creates profile + roadmap)
curl -X POST "$BACKEND/api/onboarding" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN" \
  -d '{"target_role":"AI/ML Engineer","background":"Final-year CSE student, comfortable with Python and basic ML","timeline_months":3}'

# today's tasks
curl -X GET "$BACKEND/api/tasks/today" -H "Authorization: Bearer YOUR_SESSION_TOKEN"

# generate quiz
curl -X POST "$BACKEND/api/quiz/generate" -H "Authorization: Bearer YOUR_SESSION_TOKEN" \
  -H "Content-Type: application/json" -d '{"topic":"Python basics","difficulty":"easy"}'

# start interview
curl -X POST "$BACKEND/api/interview/start" -H "Authorization: Bearer YOUR_SESSION_TOKEN" \
  -H "Content-Type: application/json" -d '{"focus":"Python fundamentals"}'
```

## Step 3: Browser Testing
Set the session_token cookie + Authorization header, then navigate.

## Cleanup
```
mongosh --eval "
use('test_database');
db.users.deleteMany({email: /test\.user\./});
db.user_sessions.deleteMany({session_token: /test_session/});
db.profiles.deleteMany({user_id: /test-user/});
db.roadmaps.deleteMany({user_id: /test-user/});
db.tasks.deleteMany({user_id: /test-user/});
db.quizzes.deleteMany({user_id: /test-user/});
db.interviews.deleteMany({user_id: /test-user/});
"
```

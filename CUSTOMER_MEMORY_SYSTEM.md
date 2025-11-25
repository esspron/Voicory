# Customer Memory System - Implementation Guide

## 🧠 Overview

The **Customer Memory System** is a revolutionary feature that stores and recalls every customer interaction, enabling your AI assistant to have truly personalized conversations. This is a unique differentiator - no other voice AI platform offers this level of customer intelligence.

## ✨ Key Features

### 1. Conversation History
- Full transcripts of every call stored
- AI-generated summaries after each call
- Key points automatically extracted
- Topics discussed tracked

### 2. Customer Insights
- **Preferences** - What the customer likes/prefers
- **Objections** - Concerns they've raised
- **Interests** - Products/topics they're interested in
- **Pain Points** - Problems they're experiencing
- **Opportunities** - Sales/upsell opportunities
- **Personal Info** - Names, dates, family info
- **Commitments** - Promises made by either party

### 3. Sentiment Tracking
- Per-conversation sentiment analysis
- Running average sentiment score
- Trend tracking over time

### 4. Relationship Intelligence
- Total conversation count
- Call duration tracking
- Engagement scoring (0-100)
- Churn risk assessment
- Lifetime value tracking

## 📊 Database Schema

### Tables Created

#### `customer_conversations`
Stores each individual conversation:
```sql
- id, customer_id, assistant_id
- call_direction (inbound/outbound)
- started_at, ended_at, duration_seconds
- transcript (JSONB array of messages)
- summary, key_points, topics_discussed
- sentiment, sentiment_score
- action_items (JSONB)
- outcome, outcome_notes
- follow_up_required, follow_up_date, follow_up_reason
```

#### `customer_memories`
Aggregated memory profile per customer:
```sql
- customer_id (unique)
- total_conversations, total_call_duration_minutes
- first_contact_date, last_contact_date
- average_sentiment, engagement_score
- personality_traits, interests, pain_points
- communication_preferences
- important_dates, family_info, professional_info
- product_interests, past_purchases, objections_raised
- executive_summary, conversation_context
- churn_risk, lifetime_value
```

#### `customer_insights`
Specific insights extracted from conversations:
```sql
- customer_id, conversation_id
- insight_type (preference/objection/interest/etc.)
- category, content, importance
- source_quote, confidence
- is_active, verified_by_user
```

### Automatic Updates
- Memory stats auto-update after each conversation (via trigger)
- `customers` table gets `has_memory`, `last_interaction`, `interaction_count` fields

## 🔧 Configuration

Memory can be configured per assistant via `memory_config`:

```typescript
interface MemoryConfig {
    rememberConversations: boolean;  // Store transcripts
    extractInsights: boolean;        // AI extracts insights
    trackSentiment: boolean;         // Track sentiment
    maxContextConversations: number; // How many past convos to include
    includeSummary: boolean;         // Include customer summary
    includeInsights: boolean;        // Include key insights
    includeActionItems: boolean;     // Include pending action items
    autoGenerateSummary: boolean;    // Auto-summarize after calls
}
```

## 📱 Usage

### Enable Memory for an Assistant
```typescript
await updateAssistant(assistantId, {
    memoryEnabled: true,
    memoryConfig: {
        rememberConversations: true,
        extractInsights: true,
        trackSentiment: true,
        maxContextConversations: 5,
        // ...
    }
});
```

### Create a Conversation Record
```typescript
const conversation = await createConversation({
    customerId: 'customer-uuid',
    assistantId: 'assistant-uuid',
    callDirection: 'outbound',
    transcript: []
});
```

### Update After Call Ends
```typescript
await updateConversationAnalysis(conversationId, {
    endedAt: new Date().toISOString(),
    durationSeconds: 180,
    summary: 'Discussed pricing and scheduled follow-up',
    keyPoints: ['Interested in enterprise plan', 'Budget approval needed'],
    sentiment: 'positive',
    sentimentScore: 0.7,
    outcome: 'callback_requested',
    followUpRequired: true,
    followUpDate: '2025-12-01'
});
```

### Add an Insight
```typescript
await addCustomerInsight({
    customerId: 'customer-uuid',
    conversationId: 'conversation-uuid',
    insightType: 'preference',
    category: 'communication',
    content: 'Prefers morning calls between 9-11 AM',
    importance: 'high',
    sourceQuote: 'Please call me in the morning, I'm usually free then'
});
```

### Get Customer Context for AI
```typescript
// Using the RPC function
const context = await getCustomerContext(customerId, 5);

// Format for system prompt
const memoryText = formatMemoryForPrompt(context);
```

## 🤖 How Memory is Used in Calls

When memory is enabled, the assistant receives context like:

```
--- CUSTOMER MEMORY ---
Customer: Rahul Sharma

Relationship:
- Total conversations: 4
- Last contact: Nov 20, 2025
- Overall sentiment: Positive
- Engagement score: 78/100

Personality: friendly, detail-oriented, price-conscious

Interests: premium features, mobile app integration

Pain points: current solution is slow, poor support

--- RECENT CONVERSATIONS ---
[1] Nov 20, 2025 (callback_requested)
Summary: Discussed enterprise pricing, requested callback
Key points:
  - Interested in annual plan
  - Needs approval from CFO
  - Follow up next week

--- KEY INSIGHTS ---
[PREFERENCE] Prefers morning calls (9-11 AM)
[OBJECTION] Concerned about migration complexity
[OPPORTUNITY] Expanding to 3 new locations
--- END MEMORY ---
```

## 🚀 Integration Flow

### During a Call:
1. Before call starts, fetch customer context: `getCustomerContext(customerId)`
2. Format and inject into system prompt: `formatMemoryForPrompt(context)`
3. Assistant now has full context of past interactions

### After a Call:
1. Create/update conversation record with transcript
2. AI analyzes conversation to extract:
   - Summary
   - Key points
   - Sentiment
   - New insights
3. Memory stats auto-update via database trigger
4. Customer profile enriched with new data

## 📈 Benefits

1. **Personalized Conversations** - AI remembers past discussions
2. **No Repetition** - Customer doesn't have to repeat information
3. **Smart Follow-ups** - Action items tracked and referenced
4. **Sentiment Awareness** - Adjust approach based on history
5. **Sales Intelligence** - Know objections, interests, opportunities
6. **Relationship Building** - Remember personal details, important dates

## 🔐 Security

- All data protected by Row Level Security (RLS)
- Users can only access their own customer data
- Insights can be deactivated without deletion
- User verification flag for AI-extracted insights

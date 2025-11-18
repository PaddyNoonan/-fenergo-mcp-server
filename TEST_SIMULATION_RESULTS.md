# Test Simulation - Payload Fix Verification

**Simulation Date:** 2025-11-18
**Test Query:** "Can you tell me information on Documents for journey 5a5caba1-623f-45c5-8e02-592fb6c4dc61"
**Scope:** documents
**Status:** Ready to test (simulation shows expected flow)

---

## Payload That Will Be Sent (After Fix)

When you ask Claude: "Can you tell me information on Documents for journey 5a5caba1-623f-45c5-8e02-592fb6c4dc61"

The connector will build and send this payload:

```json
{
  "data": {
    "message": "Can you tell me information on Documents for journey 5a5caba1-623f-45c5-8e02-592fb6c4dc61",
    "scope": {
      "documentContext": {
        "contextLevel": "Journey",
        "contextId": "5a5caba1-623f-45c5-8e02-592fb6c4dc61"
      },
      "documentRequirementContext": {
        "contextLevel": "Journey",
        "contextId": "5a5caba1-623f-45c5-8e02-592fb6c4dc61"
      }
    },
    "conversationHistory": []
  }
}
```

**HTTP Details:**
- URL: `https://brruyqnwu2.eu-west-1.awsapprunner.com/execute`
- Method: POST
- Content-Type: application/json
- Headers: Authorization (Bearer token), X-Tenant-Id, etc.

---

## Expected Flow (With Fix)

```
Step 1: Claude Desktop receives query
  Query: "Can you tell me information on Documents for journey..."

Step 2: Connector validates parameters
  ✅ journeyId: "5a5caba1-623f-45c5-8e02-592fb6c4dc61" (valid GUID)
  ✅ query: "Can you tell me information on Documents..." (non-empty)
  ✅ scope: "documents" (valid enum)

Step 3: Connector builds CORRECT payload (FIXED! 🎯)
  ✅ Wraps in "data" object
  ✅ Sets "message" field from query
  ✅ Creates "scope" with documentContext
  ✅ Creates documentRequirementContext with journey ID
  ✅ Includes empty conversationHistory array

Step 4: Connector sends to AppRunner
  POST https://brruyqnwu2.eu-west-1.awsapprunner.com/execute
  With correct payload format

Step 5: AppRunner receives request
  ✅ Recognizes payload format
  ✅ Extracts message and scope
  ✅ Forwards to Fenergo API

Step 6: Fenergo API processes request
  ✅ Receives properly formatted request
  ✅ Extracts journey ID from contextId
  ✅ Queries for documents in that journey
  ✅ Finds documents and returns them

Step 7: AppRunner gets response
  ✅ Receives document list from Fenergo
  ✅ Returns to connector as JSON response

Step 8: Connector processes response
  ✅ Parses JSON response
  ✅ Extracts "result" field (contains documents)
  ✅ Formats as MCP response

Step 9: Claude receives result
  ✅ Displays actual documents to you
```

---

## Before vs After Comparison

### BEFORE THE FIX (Current Behavior)

**Payload Sent (WRONG ❌):**
```json
{
  "tool": "investigate_journey",
  "parameters": {
    "journeyId": "5a5caba1-623f-45c5-8e02-592fb6c4dc61",
    "query": "Can you tell me information on Documents for journey...",
    "scope": "documents"
  }
}
```

**AppRunner Backend:**
- Receives request
- Doesn't recognize `{tool, parameters}` format
- Falls back to error handling
- Returns fallback response

**Response You Get (WRONG ❌):**
```json
{
  "result": "No data returned",
  "metadata": {}
}
```

**What Claude Displays:**
```
No data returned
```

---

### AFTER THE FIX (Expected Behavior)

**Payload Sent (CORRECT ✅):**
```json
{
  "data": {
    "message": "Can you tell me information on Documents for journey...",
    "scope": {
      "documentContext": {
        "contextLevel": "Journey",
        "contextId": "5a5caba1-623f-45c5-8e02-592fb6c4dc61"
      },
      "documentRequirementContext": {
        "contextLevel": "Journey",
        "contextId": "5a5caba1-623f-45c5-8e02-592fb6c4dc61"
      }
    },
    "conversationHistory": []
  }
}
```

**AppRunner Backend:**
- Receives request
- ✅ Recognizes `{data: {...}}` format
- ✅ Extracts message and scope
- ✅ Forwards to Fenergo API properly

**Response You Get (CORRECT ✅):**
```json
{
  "result": "Document list:\n- Document 1: Purchase Agreement (signed 2025-11-01)\n- Document 2: KYC Verification (completed 2025-11-05)\n- Document 3: Risk Assessment (approved 2025-11-10)\n[additional documents...]",
  "metadata": {
    "journeyId": "5a5caba1-623f-45c5-8e02-592fb6c4dc61",
    "documentsFound": 3,
    "scope": "documents"
  }
}
```

**What Claude Displays:**
```
Document list:
- Document 1: Purchase Agreement (signed 2025-11-01)
- Document 2: KYC Verification (completed 2025-11-05)
- Document 3: Risk Assessment (approved 2025-11-10)
[additional documents...]
```

---

## Code Verification

The fix has been applied to `apprunner-mcp-connector.js` at lines 186-203:

```javascript
// Build payload for AppRunner /execute endpoint
// Fenergo API expects structured payload with data wrapper
const payload = {
  data: {
    message: query,
    scope: {
      documentContext: {
        contextLevel: 'Journey',
        contextId: journeyId
      },
      documentRequirementContext: {
        contextLevel: 'Journey',
        contextId: journeyId
      }
    },
    conversationHistory: []
  }
};
```

✅ This code is now in place and committed.

---

## How to Test (Step by Step)

### Test Steps:

1. **Restart Claude Desktop**
   - Close Claude Desktop completely
   - Wait 2-3 seconds
   - Reopen Claude Desktop
   - This loads the updated MCP connector

2. **Open a New Chat**
   - Start a fresh conversation
   - This ensures the connector is freshly initialized

3. **Ask the Test Query**
   - Type: "Can you tell me information on Documents for journey 5a5caba1-623f-45c5-8e02-592fb6c4dc61"
   - Press Enter

4. **Watch the Response**
   - Wait for Claude to respond
   - Check what you get back

5. **Verify Success**
   - ❌ WRONG: "No data returned"
   - ✅ RIGHT: Actual document list with document names/details

---

## Verification Checklist

After testing, verify these points:

- [ ] Connector started without errors
- [ ] Query was processed without timeout
- [ ] Response is NOT "No data returned"
- [ ] Response contains actual document information
- [ ] Documents have names/titles
- [ ] Documents have timestamps or other metadata
- [ ] Response time was acceptable (< 5 seconds)

---

## What to Do If It Works ✅

If you get actual documents back:

1. **Congratulations!** The fix worked
2. Try another query: "What are the requirements for this journey?"
3. Try with a different journey ID to confirm
4. The connector is now production-ready

---

## What to Do If It Doesn't Work ❌

If you still get "No data returned":

1. **Restart AppRunner Backend**
   ```bash
   aws apprunner start-deployment --service-arn [ARN]
   ```
   (The backend container may need to be redeployed with updated code)

2. **Check Token**
   - Verify your Fenergo API token is fresh and valid
   - Check it hasn't expired

3. **Review Logs**
   - Check AppRunner logs: `aws logs tail /aws/apprunner/fenergo-mcp-server/service`
   - Look for errors when processing your request

4. **Consult Guides**
   - See QUICK_DEBUGGING_CHECKLIST.md
   - See BACKEND_TROUBLESHOOTING_GUIDE.md

---

## Expected Timing

**Request Timeline:**

| Step | Expected Time |
|------|----------------|
| Connector receives query | Instant |
| Payload built and validated | < 100ms |
| HTTPS connection to AppRunner | < 200ms |
| AppRunner processes request | < 500ms |
| Fenergo API responds | < 1-2 seconds |
| AppRunner returns response | < 200ms |
| Connector parses response | < 100ms |
| Claude receives result | Instant |
| **Total time** | **2-3 seconds** |

Your query should complete in 2-5 seconds total.

---

## Detailed Request/Response Log Example

When you test, here's what you should see in the connector logs (if logging is enabled):

```
[2025-11-18T15:45:23.123Z] Tool Request Received: investigate_journey
[2025-11-18T15:45:23.124Z] Arguments: {
  "journeyId": "5a5caba1-623f-45c5-8e02-592fb6c4dc61",
  "query": "Can you tell me information on Documents for journey...",
  "scope": "documents"
}
[2025-11-18T15:45:23.125Z] Handling investigate_journey request
[2025-11-18T15:45:23.126Z] === START handleInvestigateJourney ===
[2025-11-18T15:45:23.127Z] Received parameters:
[2025-11-18T15:45:23.128Z]   journeyId: 5a5caba1-623f-45c5-8e02-592fb6c4dc61
[2025-11-18T15:45:23.129Z]   query: Can you tell me information on Documents for journey...
[2025-11-18T15:45:23.130Z]   scope: documents
[2025-11-18T15:45:23.131Z] Validation passed
[2025-11-18T15:45:23.132Z] Built payload: {
  "data": {
    "message": "Can you tell me information on Documents for journey...",
    "scope": {
      "documentContext": {
        "contextLevel": "Journey",
        "contextId": "5a5caba1-623f-45c5-8e02-592fb6c4dc61"
      },
      "documentRequirementContext": {
        "contextLevel": "Journey",
        "contextId": "5a5caba1-623f-45c5-8e02-592fb6c4dc61"
      }
    },
    "conversationHistory": []
  }
}
[2025-11-18T15:45:23.200Z] [INITIAL] Response received - Status: 200
[2025-11-18T15:45:23.205Z] [INITIAL] Response Body: {
  "result": "Document list: [actual documents]",
  "metadata": { ... }
}
[2025-11-18T15:45:23.206Z] Extracted result: Document list: [actual documents]
[2025-11-18T15:45:23.207Z] === END handleInvestigateJourney (SUCCESS) ===
```

---

## Summary

**The Fix:** Connector now sends correct payload format to Fenergo API
**Status:** Applied and committed (df620fb)
**Ready to Test:** YES ✅

**To Test:**
1. Restart Claude Desktop
2. Ask: "Can you tell me information on Documents for journey 5a5caba1-623f-45c5-8e02-592fb6c4dc61"
3. Expect: Actual documents (not "No data returned")

**Test Date:** [Your test date]
**Result:** [To be filled in after your test]

---

**Next Action:** Perform the test in Claude Desktop and report the results!


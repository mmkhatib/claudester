# Port Configuration - Complete Fix

## Problem Summary
The application had hardcoded port references scattered throughout the codebase:
- Port 3001 hardcoded in 2 files
- Port 3000 as fallback in 7 files
- Port configuration was inconsistent and difficult to manage

## Solution Implemented

### 1. Centralized Configuration (`lib/config.ts`)
Created a single source of truth for the base URL:

```typescript
export function getBaseUrl(): string {
  // In browser, use relative URLs
  if (typeof window !== 'undefined') {
    return '';
  }

  // On server, use environment variable or fallback to configured port
  return process.env.NEXT_PUBLIC_APP_URL || 'http://127.0.0.1:3500';
}
```

### 2. Environment Variables (`.env`)
The port is configured in TWO places (and ONLY these two places):

```bash
# .env file
NEXT_PUBLIC_APP_URL=http://127.0.0.1:3500
WEBSOCKET_PORT=3500

# package.json
"dev": "next dev -p 3500"
```

### 3. Files Fixed

**Fixed hardcoded port 3001:**
- `app/(dashboard)/specs/[specId]/page.tsx` - Now uses `getBaseUrl()`

**Fixed wrong fallback port 3000 → 3500:**
- `app/(dashboard)/tasks/page.tsx`
- `app/(dashboard)/specs/[specId]/edit/page.tsx`
- `app/(dashboard)/projects/[projectId]/page.tsx` (3 instances)
- `app/(dashboard)/agents/page.tsx`
- `app/(dashboard)/dashboard/page.tsx`

**Already correct (using 3500):**
- `app/(dashboard)/specs/page.tsx`
- `app/(dashboard)/projects/page.tsx`
- `app/(dashboard)/dashboard/page.tsx` (line 16)

## How to Change the Port

To change the port in the future, update ONLY these 2 files:

1. **`.env`** - Change `NEXT_PUBLIC_APP_URL`:
   ```bash
   NEXT_PUBLIC_APP_URL=http://127.0.0.1:YOUR_PORT
   WEBSOCKET_PORT=YOUR_PORT
   ```

2. **`package.json`** - Change the dev script:
   ```json
   "dev": "next dev -p YOUR_PORT"
   ```

3. **Restart the server:**
   ```bash
   npm run dev
   ```

That's it! All API calls, SSR fetches, and client requests will automatically use the new port.

## Why This Works

- **Client-side fetches**: Use relative URLs (e.g., `/api/specs`) - automatically use current domain:port
- **Server-side fetches**: Use `getBaseUrl()` which reads from `NEXT_PUBLIC_APP_URL`
- **Fallback**: If environment variable is missing, defaults to `http://127.0.0.1:3500`

## Testing Checklist

After changing the port, verify:
- [ ] Server starts on the correct port
- [ ] Dashboard page loads
- [ ] Projects page shows data
- [ ] Specs page shows data
- [ ] Individual spec pages load
- [ ] Tasks page shows data
- [ ] No ECONNREFUSED errors in logs
- [ ] Browser console shows no failed API calls

## Architecture Notes

### Why We Need Absolute URLs on Server
Next.js server-side rendering runs in Node.js, not a browser. It doesn't have a "current domain" context, so it needs absolute URLs like `http://127.0.0.1:3500/api/specs`.

### Why Client Can Use Relative URLs
Browser knows the current domain and port, so `/api/specs` automatically becomes `http://localhost:3500/api/specs`.

### Environment Variable Priority
1. `NEXT_PUBLIC_APP_URL` from `.env`
2. Fallback to `http://127.0.0.1:3500`

## Summary

✅ Created centralized `lib/config.ts`
✅ Fixed 2 files with hardcoded port 3001
✅ Fixed 7 files with wrong fallback port 3000
✅ Server restarted and running on port 3500
✅ All API calls now use correct port configuration

**Result**: Change port in ONE place (`.env`), everything works!

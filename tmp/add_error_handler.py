import re

with open('server/routes.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Find the createServer line and insert error handlers before it
old = """  const httpServer = createServer(app);
  return httpServer;"""

new = """  // Register error handlers AFTER all routes so they catch errors thrown by route handlers
  app.use(notFoundHandler);
  app.use(errorHandler);

  const httpServer = createServer(app);
  return httpServer;"""

if old in content:
    content = content.replace(old, new)
    with open('server/routes.ts', 'w', encoding='utf-8') as f:
        f.write(content)
    print("SUCCESS: Error handlers added to routes.ts")
else:
    print("FAIL: Could not find the createServer line")
    # Try to find it approximately
    idx = content.find('createServer(app)')
    if idx >= 0:
        print(f"Found 'createServer(app)' at position {idx}")
        print(content[idx-50:idx+100])

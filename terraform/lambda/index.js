// AWS Lambda Handler for Public Web Application Backend API
exports.handler = async (event) => {
  console.log('Incoming request:', {
    path: event.rawPath || event.path,
    method: event.requestContext?.http?.method || event.httpMethod,
    headers: event.headers,
    queryParams: event.queryStringParameters,
  });

  const path = event.rawPath || event.path || '/';
  const method = (event.requestContext?.http?.method || event.httpMethod || 'GET').toUpperCase();
  const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
  };

  // Handle CORS preflight
  if (method === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: corsHeaders,
      body: '',
    };
  }

  // 1. Health check
  if (path.endsWith('/health') || path === '/api/health') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        status: 'UP',
        timestamp: new Date().toISOString(),
        service: 'AWS WAF Protected API',
        environment: process.env.NODE_ENV || 'production',
        wafProtected: true,
      }),
    };
  }

  // 2. Users endpoint (Target for SQL Injection testing)
  if (path.endsWith('/users') || path === '/api/users') {
    const query = event.queryStringParameters || {};
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        message: 'Query executed successfully through safe backend sanitization.',
        queriedId: query.id || 'all',
        data: [
          { id: '1', username: 'admin_sys', role: 'Security Analyst', department: 'SecOps' },
          { id: '2', username: 'auditor_01', role: 'Compliance Officer', department: 'Audit' },
        ],
        note: 'If an SQL injection pattern was passed and you see this message, the request reached the backend (WAF rule was in COUNT mode or bypassed). When WAF is in BLOCK mode, you will receive a 403 Forbidden from AWS CloudFront/WAF directly.',
      }),
    };
  }

  // 3. Login endpoint (Target for Rate Limiting / Brute Force testing)
  if (path.endsWith('/login') || path === '/api/login') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        status: 'success',
        message: 'Authentication request accepted.',
        timestamp: new Date().toISOString(),
        clientIp: event.requestContext?.http?.sourceIp || event.headers?.['x-forwarded-for'] || 'unknown',
      }),
    };
  }

  // 4. Catalog / Products endpoint (Target for Bot traffic testing)
  if (path.endsWith('/catalog') || path === '/api/catalog' || path.endsWith('/products')) {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        items: [
          { sku: 'WAF-001', name: 'SQL Injection Shield', status: 'ACTIVE' },
          { sku: 'WAF-002', name: 'Bot Traffic Filter', status: 'ACTIVE' },
          { sku: 'WAF-003', name: 'Rate Limiter Service', status: 'ACTIVE' },
        ],
        userAgentSeen: event.headers?.['user-agent'] || 'unknown',
      }),
    };
  }

  // Default fallback
  return {
    statusCode: 200,
    headers: corsHeaders,
    body: JSON.stringify({
      message: 'AWS WAF Protected API Gateway Lambda Backend',
      path: path,
      method: method,
    }),
  };
};

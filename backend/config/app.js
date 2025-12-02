
// Initialize OpenAI client (will be null if API key not set)
let openai = null;
if (process.env.OPENAI_API_KEY) {
    openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
    });
    console.log('✅ OpenAI client initialized');
} else {
    console.warn('⚠️ OPENAI_API_KEY not set - AI features will be disabled');
}

const app = express();
const port = process.env.PORT || 3001;

// ============================================
// SECURITY MIDDLEWARE (Apply in order)
// ============================================

// Trust proxy (Railway/Vercel are behind proxies)
app.set('trust proxy', 1);

// Request ID for tracing
app.use(requestId);

// IP-based blocking for banned IPs
app.use(ipBlocker());

// Request timeout (30 seconds)
app.use(requestTimeout(30000));

// Security headers (CSP, HSTS, X-Frame-Options, etc.)
app.use(securityHeaders({
    isDevelopment: process.env.NODE_ENV !== 'production'
}));

// CORS configuration for production
app.use(cors({
    origin: [
        'http://localhost:5173',
        'https://voicory.vercel.app',
        'https://voicory.com',
        /\.vercel\.app$/,
        /\.railway\.app$/
    ],
    credentials: true
}));

// JSON body parser with size limit
app.use(express.json({ limit: '5mb' }));

// URL-encoded parser for webhooks
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Prototype pollution protection
app.use(sanitizeRequest);

// Injection detection (SQL, XSS)
app.use(injectionDetector);

// Rate limiting middleware factory
const apiRateLimit = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 100, // 100 requests per minute
    keyGenerator: (req) => req.userId || req.ip
});

const authRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 auth attempts
    keyGenerator: (req) => req.ip
});

const webhookRateLimit = rateLimit({
    windowMs: 60 * 1000,
    max: 1000, // High limit for webhooks
    keyGenerator: (req) => req.ip
});

console.log('✅ Security middleware stack initialized');

const supabaseUrl = process.env.SUPABASE_URL;
// Use service role key for backend operations (bypasses RLS)
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase configuration!');
    process.exit(1);
}

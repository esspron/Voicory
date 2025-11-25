# Authentication Quick Reference

## Using Authentication in Components

### Import the Hook
```typescript
import { useAuth } from '../contexts/AuthContext';
```

### Access Auth State
```typescript
const { user, isAuthenticated, loading, signIn, signUp, signOut } = useAuth();
```

### Check if User is Logged In
```typescript
const { isAuthenticated } = useAuth();

if (isAuthenticated) {
  // User is logged in
}
```

### Get Current User
```typescript
const { user } = useAuth();

// Access user properties
console.log(user?.email);
console.log(user?.id);
```

### Sign In
```typescript
const { signIn } = useAuth();

const handleLogin = async () => {
  const { error } = await signIn(email, password);
  if (error) {
    console.error('Login failed:', error);
  } else {
    // Success - user is now authenticated
  }
};
```

### Sign Out
```typescript
const { signOut } = useAuth();

const handleLogout = async () => {
  await signOut();
  // User is now logged out
};
```

### Loading State
```typescript
const { loading } = useAuth();

if (loading) {
  return <div>Loading...</div>;
}
```

## Protected Routes

### Wrap Routes That Need Authentication
```typescript
import ProtectedRoute from './components/ProtectedRoute';

<Route element={<ProtectedRoute />}>
  <Route path="/dashboard" element={<Dashboard />} />
  <Route path="/profile" element={<Profile />} />
</Route>
```

### Redirect Authenticated Users Away
```typescript
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';

const LoginPage = () => {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <LoginForm />;
};
```

## Common Patterns

### Display User Info in UI
```typescript
const { user } = useAuth();

return (
  <div>
    <p>Welcome, {user?.email}</p>
    <p>User ID: {user?.id}</p>
  </div>
);
```

### Conditional Rendering Based on Auth
```typescript
const { isAuthenticated } = useAuth();

return (
  <div>
    {isAuthenticated ? (
      <LoggedInContent />
    ) : (
      <LoginPrompt />
    )}
  </div>
);
```

### Form Submission with Error Handling
```typescript
const { signIn } = useAuth();
const [error, setError] = useState('');
const navigate = useNavigate();

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setError('');

  const { error } = await signIn(email, password);
  
  if (error) {
    setError(error.message);
  } else {
    navigate('/dashboard');
  }
};
```

## Available User Properties

The `user` object from Supabase Auth includes:
- `user.id` - Unique user ID
- `user.email` - User's email address
- `user.created_at` - Account creation timestamp
- `user.updated_at` - Last update timestamp
- `user.user_metadata` - Custom user metadata
- `user.app_metadata` - App-specific metadata

## Authentication Service Methods

Direct access to auth methods (alternative to `useAuth` hook):

```typescript
import AuthService from '../services/authService';

// Sign up
await AuthService.signUp(email, password);

// Sign in
await AuthService.signIn(email, password);

// Sign out
await AuthService.signOut();

// Get current user
const user = await AuthService.getCurrentUser();

// Check if authenticated
const isAuth = await AuthService.isAuthenticated();

// Reset password
await AuthService.resetPassword(email);

// Listen to auth changes
AuthService.onAuthStateChange((user) => {
  console.log('Auth state changed:', user);
});
```

## Row Level Security (RLS)

When querying Supabase tables, RLS automatically filters data based on the authenticated user:

```typescript
import { supabase } from '../services/supabase';

// This query automatically uses the current user's ID
const { data, error } = await supabase
  .from('assistants')
  .select('*');
  // RLS ensures only user's own assistants are returned
```

The `user_id` is automatically available in RLS policies via `auth.uid()`.

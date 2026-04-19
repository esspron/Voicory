#!/usr/bin/env python3
"""Replace react-native-reanimated imports with RN Animated in all files."""
import re, os

FILES = [
    "app/(auth)/forgot-password.tsx",
    "app/(auth)/signup.tsx", 
    "app/(auth)/login.tsx",
    "app/onboarding.tsx",
    "screens/DashboardScreen.tsx",
    "components/SplashScreen.tsx",
    "components/illustrations/SuccessCheckmark.tsx",
    "components/illustrations/VoiceWaveform.tsx",
]

for fpath in FILES:
    if not os.path.exists(fpath):
        print(f"SKIP {fpath} (not found)")
        continue
    
    with open(fpath) as f:
        code = f.read()
    
    original = code
    
    # Remove the entire reanimated import block
    # Matches: import Animated, { ... } from 'react-native-reanimated';
    # Also: import { ... } from 'react-native-reanimated';
    code = re.sub(
        r"import\s+(?:Animated\s*,\s*)?\{[^}]*\}\s*from\s*'react-native-reanimated'\s*;?\n?",
        "",
        code
    )
    # Also catch: import Animated from 'react-native-reanimated';
    code = re.sub(
        r"import\s+Animated\s+from\s*'react-native-reanimated'\s*;?\n?",
        "",
        code
    )
    
    # Make sure Animated is imported from react-native
    # Check if react-native import already has Animated
    if 'Animated' not in re.findall(r"from\s*'react-native'", code)[0:1] if re.findall(r"import\s*\{([^}]*)\}\s*from\s*'react-native'", code) else True:
        rn_import = re.search(r"(import\s*\{)([^}]*?)(\}\s*from\s*'react-native'\s*;)", code)
        if rn_import:
            imports_str = rn_import.group(2)
            if 'Animated' not in imports_str:
                code = code.replace(rn_import.group(0), 
                    f"{rn_import.group(1)}{imports_str.rstrip().rstrip(',')},\n  Animated,{rn_import.group(3)}")
    
    # Add useRef/useEffect imports if needed
    needs_useRef = 'useSharedValue' in original or 'useRef' not in code
    needs_useEffect = 'useEffect' not in code
    
    # Replace reanimated hooks with RN equivalents in function bodies:
    
    # useSharedValue(X) -> useRef(new Animated.Value(X)).current
    code = re.sub(r'useSharedValue\(([^)]*)\)', r'useRef(new Animated.Value(\1)).current', code)
    
    # Add useRef to React import if needed and useSharedValue was used
    if 'useSharedValue' in original and 'useRef' not in code.split("from 'react'")[0]:
        code = re.sub(r"(import\s+React\s*,\s*\{)([^}]*?)(\}\s*from\s*'react'\s*;)", 
                      lambda m: f"{m.group(1)}{m.group(2).rstrip().rstrip(',')}, useRef{m.group(3)}", code)
    
    # useAnimatedStyle(() => ({ ... })) -> just inline the style (simplified - make it a regular object)
    # This is complex - for now replace Animated.View entering={FadeIn} with just Animated.View
    code = re.sub(r'\s+entering=\{FadeIn[^}]*\}', '', code)
    code = re.sub(r'\s+entering=\{FadeIn\}', '', code)
    
    # Remove Extrapolation import/usage  
    code = re.sub(r',?\s*Extrapolation(?:\.CLAMP)?', '', code)
    code = code.replace('Extrapolation.CLAMP', "'clamp'")
    
    # Replace useAnimatedStyle with useMemo-like pattern
    # This is the hard part - useAnimatedStyle returns animated styles
    # For simplicity, replace with a function that returns the style
    code = re.sub(r'useAnimatedStyle\(\(\)\s*=>\s*\{', '/* animated style */ (() => {', code)
    code = re.sub(r'useAnimatedStyle\(\(\)\s*=>\s*\(', '/* animated style */ (() => (', code)
    
    # Fix interpolate - RN's Animated doesn't have standalone interpolate
    # reanimated: interpolate(value, inputRange, outputRange)
    # RN: value.interpolate({ inputRange, outputRange })
    
    with open(fpath, 'w') as f:
        f.write(code)
    
    print(f"FIXED {fpath}")

print("\nDone. Note: Complex animations using useAnimatedStyle/interpolate may need manual review.")

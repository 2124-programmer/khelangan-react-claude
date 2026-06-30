import React from 'react';
import { Text } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { colors } from '../theme';

import PlayerHomeScreen from '../screens/player/PlayerHomeScreen';
import VenueDetailScreen from '../screens/player/VenueDetailScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import OTPVerificationScreen from '../screens/auth/OTPVerificationScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import AboutScreen from '../screens/AboutScreen';
import { TermsScreen, PrivacyPolicyScreen, HowItWorksScreen } from '../screens/InfoScreens';

// Info/legal screens reachable from the About tab.
const INFO_SCREENS = [
  { name: 'HowItWorks', component: HowItWorksScreen },
  { name: 'Terms', component: TermsScreen },
  { name: 'Privacy', component: PrivacyPolicyScreen },
];

// Auth screens reachable from any guest tab via navigation.navigate('Login')
const AUTH_SCREENS = [
  { name: 'Login', component: LoginScreen },
  { name: 'Register', component: RegisterScreen },
  { name: 'OTPVerification', component: OTPVerificationScreen },
  { name: 'ForgotPassword', component: ForgotPasswordScreen },
];

function makeStack(initialName: string, initialComponent: any, extra: typeof AUTH_SCREENS = []) {
  const Stack = createNativeStackNavigator();
  const screens = [
    { name: initialName, component: initialComponent },
    { name: 'VenueDetail', component: VenueDetailScreen },
    ...AUTH_SCREENS,
    ...extra,
  ].filter((s, i, arr) => arr.findIndex((x) => x.name === s.name) === i);

  return function GuestStackNav() {
    return (
      <Stack.Navigator initialRouteName={initialName} screenOptions={{ headerShown: false }}>
        {screens.map((s) => (
          <Stack.Screen key={s.name} name={s.name} component={s.component} />
        ))}
      </Stack.Navigator>
    );
  };
}

const HomeStack = makeStack('GuestHome', PlayerHomeScreen);

// LoginTab is a dedicated stack whose initial screen is the login page
const LoginStack = makeStack('Login', LoginScreen);

// About tab is a stack so its rows (How it works / Terms / Privacy) can push detail screens.
const AboutStack = makeStack('AboutHome', AboutScreen, INFO_SCREENS);

const Tab = createBottomTabNavigator();

function tabIcon(icon: string) {
  return ({ focused }: { focused: boolean }) => (
    <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.45 }}>{icon}</Text>
  );
}

export default function GuestNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textDim,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: 60,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontSize: 11 },
      }}
    >
      <Tab.Screen name="GuestHomeTab" component={HomeStack} options={{ title: 'Home', tabBarIcon: tabIcon('🏠') }} />
      <Tab.Screen name="GuestAboutTab" component={AboutStack} options={{ title: 'About', tabBarIcon: tabIcon('ℹ️') }} />
      <Tab.Screen name="GuestLoginTab" component={LoginStack} options={{ title: 'Sign In', tabBarIcon: tabIcon('👤') }} />
    </Tab.Navigator>
  );
}

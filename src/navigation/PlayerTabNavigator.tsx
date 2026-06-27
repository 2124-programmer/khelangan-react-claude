import React from 'react';
import { Text } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { colors } from '../theme';

import PlayerHomeScreen from '../screens/player/PlayerHomeScreen';
import VenueDetailScreen from '../screens/player/VenueDetailScreen';
import SlotSelectionScreen from '../screens/player/SlotSelectionScreen';
import BookingConfirmScreen from '../screens/player/BookingConfirmScreen';
import PaymentScreen from '../screens/player/PaymentScreen';
import BookingSuccessScreen from '../screens/player/BookingSuccessScreen';
import MyBookingsScreen from '../screens/player/MyBookingsScreen';
import BookingDetailScreen from '../screens/player/BookingDetailScreen';
import RateReviewScreen from '../screens/player/RateReviewScreen';
import VenueReviewsScreen from '../screens/player/VenueReviewsScreen';
import NotificationsScreen from '../screens/player/NotificationsScreen';
import PlayerProfileScreen from '../screens/player/PlayerProfileScreen';
import {
  OffersScreen, WalletScreen, HelpSupportScreen, SettingsScreen,
  EditProfileScreen, RescheduleScreen, DisputeScreen, RoleChangeScreen,
  DeleteAccountScreen,
} from '../screens/player/MiscScreens';
import SecurityScreen from '../screens/player/SecurityScreen';
import ChangePasswordScreen from '../screens/player/ChangePasswordScreen';
import EmailChangeScreen from '../screens/player/EmailChangeScreen';
import PhoneChangeScreen from '../screens/player/PhoneChangeScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';

// Screens reachable from anywhere in the player app. Registered in every tab's
// stack so any `navigation.navigate('X')` resolves regardless of the active tab.
const SHARED = [
  { name: 'VenueDetail', component: VenueDetailScreen },
  { name: 'SlotSelection', component: SlotSelectionScreen },
  { name: 'BookingConfirm', component: BookingConfirmScreen },
  { name: 'Payment', component: PaymentScreen },
  { name: 'BookingSuccess', component: BookingSuccessScreen },
  { name: 'BookingDetail', component: BookingDetailScreen },
  { name: 'RateReview', component: RateReviewScreen },
  { name: 'VenueReviews', component: VenueReviewsScreen },
  { name: 'Notifications', component: NotificationsScreen },
  { name: 'Offers', component: OffersScreen },
  { name: 'Wallet', component: WalletScreen },
  { name: 'HelpSupport', component: HelpSupportScreen },
  { name: 'Settings', component: SettingsScreen },
  { name: 'EditProfile', component: EditProfileScreen },
  { name: 'Reschedule', component: RescheduleScreen },
  { name: 'Dispute', component: DisputeScreen },
  { name: 'RoleChange', component: RoleChangeScreen },
  { name: 'Security', component: SecurityScreen },
  { name: 'ChangePassword', component: ChangePasswordScreen },
  { name: 'EmailChange', component: EmailChangeScreen },
  { name: 'PhoneChange', component: PhoneChangeScreen },
  { name: 'DeleteAccount', component: DeleteAccountScreen },
  { name: 'ForgotPassword', component: ForgotPasswordScreen },
];

function makeStack(initialName: string, initialComponent: any) {
  const Stack = createNativeStackNavigator();
  const screens = [{ name: initialName, component: initialComponent }, ...SHARED]
    .filter((s, i, arr) => arr.findIndex((x) => x.name === s.name) === i);
  return function StackNav() {
    return (
      <Stack.Navigator initialRouteName={initialName} screenOptions={{ headerShown: false }}>
        {screens.map((s) => (
          <Stack.Screen key={s.name} name={s.name} component={s.component} />
        ))}
      </Stack.Navigator>
    );
  };
}

const HomeStack = makeStack('Home', PlayerHomeScreen);
const BookingsStack = makeStack('BookingsHome', MyBookingsScreen);
const OffersStack = makeStack('OffersHome', OffersScreen);
const ProfileStack = makeStack('ProfileHome', PlayerProfileScreen);

const Tab = createBottomTabNavigator();

function tabIcon(icon: string) {
  return ({ focused }: { focused: boolean }) => (
    <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.45 }}>{icon}</Text>
  );
}

export default function PlayerTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textDim,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border, height: 60, paddingBottom: 8, paddingTop: 6 },
        tabBarLabelStyle: { fontSize: 11 },
      }}
    >
      <Tab.Screen name="HomeTab" component={HomeStack} options={{ title: 'Home', tabBarIcon: tabIcon('🏠') }} />
      <Tab.Screen name="Bookings" component={BookingsStack} options={{ title: 'Bookings', tabBarIcon: tabIcon('📅') }} />
      <Tab.Screen name="OffersTab" component={OffersStack} options={{ title: 'Offers', tabBarIcon: tabIcon('🎟️') }} />
      <Tab.Screen name="Profile" component={ProfileStack} options={{ title: 'Profile', tabBarIcon: tabIcon('👤') }} />
    </Tab.Navigator>
  );
}

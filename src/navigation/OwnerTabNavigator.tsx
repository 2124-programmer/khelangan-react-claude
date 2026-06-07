import React from 'react';
import { Text } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { colors } from '../theme';

import OwnerDashboardScreen from '../screens/owner/OwnerDashboardScreen';
import MyVenuesScreen from '../screens/owner/MyVenuesScreen';
import AddVenueScreen from '../screens/owner/AddVenueScreen';
import VenueCalendarScreen from '../screens/owner/VenueCalendarScreen';
import CourtManagementScreen from '../screens/owner/CourtManagementScreen';
import {
  BookingManagementScreen, OwnerBookingDetailScreen, EarningsScreen,
  ReviewsManagementScreen, OwnerProfileScreen, EditVenueScreen,
  SubscriptionScreen, OwnerNotificationsScreen, OwnerSettingsScreen,
} from '../screens/owner/OwnerScreens';
import { RoleChangeScreen, EditProfileScreen } from '../screens/player/MiscScreens';

const SHARED = [
  { name: 'AddVenue', component: AddVenueScreen },
  { name: 'EditVenue', component: EditVenueScreen },
  { name: 'VenueCalendar', component: VenueCalendarScreen },
  { name: 'CourtManagement', component: CourtManagementScreen },
  { name: 'OwnerBookingDetail', component: OwnerBookingDetailScreen },
  { name: 'ReviewsManagement', component: ReviewsManagementScreen },
  { name: 'OwnerNotifications', component: OwnerNotificationsScreen },
  { name: 'Subscription', component: SubscriptionScreen },
  { name: 'OwnerSettings', component: OwnerSettingsScreen },
  { name: 'RoleChange', component: RoleChangeScreen },
  { name: 'OwnerEditProfile', component: EditProfileScreen },
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

const DashboardStack = makeStack('DashboardHome', OwnerDashboardScreen);
const VenuesStack = makeStack('VenuesHome', MyVenuesScreen);
const BookingsStack = makeStack('OwnerBookingsHome', BookingManagementScreen);
const EarningsStack = makeStack('EarningsHome', EarningsScreen);
const ProfileStack = makeStack('OwnerProfileHome', OwnerProfileScreen);

const Tab = createBottomTabNavigator();

function tabIcon(icon: string) {
  return ({ focused }: { focused: boolean }) => (
    <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.45 }}>{icon}</Text>
  );
}

export default function OwnerTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.owner,
        tabBarInactiveTintColor: colors.textDim,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border, height: 60, paddingBottom: 8, paddingTop: 6 },
        tabBarLabelStyle: { fontSize: 11 },
      }}
    >
      <Tab.Screen name="DashboardTab" component={DashboardStack} options={{ title: 'Dashboard', tabBarIcon: tabIcon('📊') }} />
      <Tab.Screen name="VenuesTab" component={VenuesStack} options={{ title: 'Venues', tabBarIcon: tabIcon('🏟') }} />
      <Tab.Screen name="OwnerBookings" component={BookingsStack} options={{ title: 'Bookings', tabBarIcon: tabIcon('📋') }} />
      <Tab.Screen name="EarningsTab" component={EarningsStack} options={{ title: 'Earnings', tabBarIcon: tabIcon('💰') }} />
      <Tab.Screen name="OwnerProfileTab" component={ProfileStack} options={{ title: 'Profile', tabBarIcon: tabIcon('👤') }} />
    </Tab.Navigator>
  );
}

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import {
  AdminBookingsScreen, PaymentsRevenueScreen,
  CouponManagementScreen, NotificationBroadcastScreen,
  AnalyticsScreen, CategoryManagementScreen, CMSScreen, AdminSettingsScreen,
} from '../screens/admin/AdminScreens';
import AdminOwnersScreen from '../screens/admin/AdminOwnersScreen';
import OwnerDetailScreen from '../screens/admin/OwnerDetailScreen';
import DisputesScreen from '../screens/admin/DisputesScreen';
import DisputeDetailScreen from '../screens/admin/DisputeDetailScreen';
import AdminProfileScreen from '../screens/admin/AdminProfileScreen';
import AdminRolesScreen from '../screens/admin/AdminRolesScreen';
import AppConfigScreen from '../screens/admin/AppConfigScreen';
import { EditProfileScreen } from '../screens/player/MiscScreens';
import ChangePasswordScreen from '../screens/player/ChangePasswordScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import NotificationsScreen from '../screens/player/NotificationsScreen';
import EmailChangeScreen from '../screens/player/EmailChangeScreen';
import PhoneChangeScreen from '../screens/player/PhoneChangeScreen';
import { SubscriptionManagementScreen, SubscriptionDetailScreen } from '../screens/admin/AdminSubscriptionScreens';
import AdminVenuesScreen from '../screens/admin/AdminVenuesScreen';
import AdminVenueDetailScreen from '../screens/admin/AdminVenueDetailScreen';
import AdminPlayersScreen from '../screens/admin/AdminPlayersScreen';
import PlayerDetailScreen from '../screens/admin/PlayerDetailScreen';

const Stack = createNativeStackNavigator();

export default function AdminNavigator() {
  return (
    <Stack.Navigator initialRouteName="AdminDashboard" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
      {/* Unified Venues screen (registry + moderation queue). VenueApproval/VenueManagement
          are kept as redirect aliases for one release so old navigation targets still resolve. */}
      <Stack.Screen name="Venues" component={AdminVenuesScreen} />
      <Stack.Screen name="VenueApproval" component={AdminVenuesScreen} />
      <Stack.Screen name="VenueManagement" component={AdminVenuesScreen} />
      <Stack.Screen name="VenueDetail" component={AdminVenueDetailScreen} />
      {/* Scaled Players management. PlayerManagement kept as a redirect alias for one release. */}
      <Stack.Screen name="Players" component={AdminPlayersScreen} />
      <Stack.Screen name="PlayerManagement" component={AdminPlayersScreen} />
      <Stack.Screen name="PlayerDetail" component={PlayerDetailScreen} />
      {/* Scaled Owners management. OwnerManagement is the dashboard route; Owners is the canonical name. */}
      <Stack.Screen name="Owners" component={AdminOwnersScreen} />
      <Stack.Screen name="OwnerManagement" component={AdminOwnersScreen} />
      <Stack.Screen name="OwnerDetail" component={OwnerDetailScreen} />
      <Stack.Screen name="AdminBookings" component={AdminBookingsScreen} />
      <Stack.Screen name="PaymentsRevenue" component={PaymentsRevenueScreen} />
      {/* Scaled Disputes triage. DisputeManagement is the dashboard route; Disputes is canonical. */}
      <Stack.Screen name="Disputes" component={DisputesScreen} />
      <Stack.Screen name="DisputeManagement" component={DisputesScreen} />
      <Stack.Screen name="DisputeDetail" component={DisputeDetailScreen} />
      <Stack.Screen name="CouponManagement" component={CouponManagementScreen} />
      <Stack.Screen name="NotificationBroadcast" component={NotificationBroadcastScreen} />
      <Stack.Screen name="Analytics" component={AnalyticsScreen} />
      <Stack.Screen name="CategoryManagement" component={CategoryManagementScreen} />
      <Stack.Screen name="CMS" component={CMSScreen} />
      <Stack.Screen name="SubscriptionManagement" component={SubscriptionManagementScreen} />
      <Stack.Screen name="SubscriptionDetail" component={SubscriptionDetailScreen} />
      <Stack.Screen name="AdminSettings" component={AdminSettingsScreen} />
      <Stack.Screen name="EmailChange" component={EmailChangeScreen} />
      <Stack.Screen name="PhoneChange" component={PhoneChangeScreen} />
      {/* Admin Profile hub + reused personal-account screens */}
      <Stack.Screen name="AdminProfile" component={AdminProfileScreen} />
      {/* Super-admin-only admin-role management (entry gated in AdminProfile). */}
      <Stack.Screen name="AdminRoles" component={AdminRolesScreen} />
      {/* Super-admin-only app configuration diagnostics (entry gated in AdminProfile). */}
      <Stack.Screen name="AppConfig" component={AppConfigScreen} />
      <Stack.Screen name="AdminEditProfile" component={EditProfileScreen} />
      <Stack.Screen name="AdminChangePassword" component={ChangePasswordScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      {/* Admin notification inbox — the NotificationBell (dashboard + profile header) routes here. */}
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
    </Stack.Navigator>
  );
}

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import {
  PlayerManagementScreen,
  OwnerManagementScreen, AdminBookingsScreen, PaymentsRevenueScreen,
  DisputeManagementScreen, CouponManagementScreen, NotificationBroadcastScreen,
  AnalyticsScreen, CategoryManagementScreen, CMSScreen, AdminSettingsScreen,
} from '../screens/admin/AdminScreens';
import AdminEmailChangeScreen from '../screens/admin/AdminEmailChangeScreen';
import { SubscriptionManagementScreen, SubscriptionDetailScreen } from '../screens/admin/AdminSubscriptionScreens';
import AdminVenuesScreen from '../screens/admin/AdminVenuesScreen';
import AdminVenueDetailScreen from '../screens/admin/AdminVenueDetailScreen';

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
      <Stack.Screen name="PlayerManagement" component={PlayerManagementScreen} />
      <Stack.Screen name="OwnerManagement" component={OwnerManagementScreen} />
      <Stack.Screen name="AdminBookings" component={AdminBookingsScreen} />
      <Stack.Screen name="PaymentsRevenue" component={PaymentsRevenueScreen} />
      <Stack.Screen name="DisputeManagement" component={DisputeManagementScreen} />
      <Stack.Screen name="CouponManagement" component={CouponManagementScreen} />
      <Stack.Screen name="NotificationBroadcast" component={NotificationBroadcastScreen} />
      <Stack.Screen name="Analytics" component={AnalyticsScreen} />
      <Stack.Screen name="CategoryManagement" component={CategoryManagementScreen} />
      <Stack.Screen name="CMS" component={CMSScreen} />
      <Stack.Screen name="SubscriptionManagement" component={SubscriptionManagementScreen} />
      <Stack.Screen name="SubscriptionDetail" component={SubscriptionDetailScreen} />
      <Stack.Screen name="AdminSettings" component={AdminSettingsScreen} />
      <Stack.Screen name="AdminEmailChange" component={AdminEmailChangeScreen} />
    </Stack.Navigator>
  );
}

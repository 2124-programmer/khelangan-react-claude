import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import {
  VenueApprovalScreen, VenueManagementScreen, PlayerManagementScreen,
  OwnerManagementScreen, AdminBookingsScreen, PaymentsRevenueScreen,
  DisputeManagementScreen, CouponManagementScreen, NotificationBroadcastScreen,
  AnalyticsScreen, CategoryManagementScreen, CMSScreen, AdminSettingsScreen,
} from '../screens/admin/AdminScreens';
import AdminEmailChangeScreen from '../screens/admin/AdminEmailChangeScreen';
import { SubscriptionManagementScreen, SubscriptionDetailScreen } from '../screens/admin/AdminSubscriptionScreens';
import VenueDetailScreen from '../screens/player/VenueDetailScreen';

const Stack = createNativeStackNavigator();

export default function AdminNavigator() {
  return (
    <Stack.Navigator initialRouteName="AdminDashboard" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
      <Stack.Screen name="VenueApproval" component={VenueApprovalScreen} />
      <Stack.Screen name="VenueDetail" component={VenueDetailScreen} />
      <Stack.Screen name="VenueManagement" component={VenueManagementScreen} />
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

import React, { useEffect, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Button, Platform, StyleSheet, Text, View } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as TaskMngr from 'expo-task-manager';
import { getLastNotificationResponseAsync, NotificationResponse, Subscription } from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from "expo-constants";

let lastNotificationTouched: NotificationResponse | null | undefined = undefined;
const ver = '0.0.1'


Notifications.registerTaskAsync('BACKGROUND-NOTIFICATION-TASK')
.then(() => {

  
  TaskMngr.isTaskRegisteredAsync('BACKGROUND-NOTIFICATION-TASK')
  .catch((error) => {console.log('Error while checking if task is defined',error)})
  .then((isDefined) => {
    console.log('Is Background Notification Defined? ', isDefined)
  })

}).catch((error) => {
  console.log('Error while setting Notification Task: ' + error)
})

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: true,
  }),
});

if (Platform.OS === 'android') {
  Notifications.setNotificationChannelAsync('default', {
    name: 'default',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#FF231F7C',
  });
}

export async function registerForPushNotificationsAsync() {
  try {
    let token;
    if (!Device.isDevice) {
      console.log('Must use physical device for Push Notifications')
      alert('Must use physical device for Push Notifications');
    } 
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    console.log('getPermissionsAsync : ', { 
      existingStatus, 
      date: new Date().toISOString()
    })
    
    console.log('Constants.easConfig?.projectId: ', { 
      projectId: Constants.expoConfig?.extra?.eas?.projectId,
      date: new Date().toISOString()
    })
    token = (await Notifications.getExpoPushTokenAsync({
      projectId: Constants.expoConfig?.extra?.eas?.projectId,
    })).data;
    console.log(token);

    return token;
  } catch (error) {
    console.log('Error while registering for pushnotification', error)
  }
  
}

async function sendPushNotification(expoPushToken: string) {
  const message = {
    to: expoPushToken,
    sound: 'default',
    title: 'Original Title',
    body: 'And here is the body!',
    data: { someData: 'goes here' },
  };

  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Accept-encoding': 'gzip, deflate',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(message),
  });
}

function useNotificationObserver() {
  React.useEffect(() => {
    let isMounted = true;

    function redirect(notification: Notifications.Notification, name: string) {
      // const url = notification.request.content.data?.url;
      // if (url) {
      //   router.push(url);
      alert(`${ver} Notification, Name: ${name}:  ` + JSON.stringify(notification.request.content, null, 2));
      console.log(`${ver} Notification, Name: ${name}:  ` + JSON.stringify(notification.request.content, null, 2));
      // }
    }

    Notifications.getLastNotificationResponseAsync() 
      .then(response => {
        console.log('getLastNotificationResponseAsync', response);
        if (!isMounted || !response?.notification) {
          alert(`${ver} !isMounted || !response?.notification ` + JSON.stringify({
            isMounted, response
          }, null, 2));

          return;
        }
        redirect(response?.notification, 'getLastNotificationResponseAsync');
      });

    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('NOTIFICATION CLICKED> ', JSON.stringify(response.notification.request.content.data, null, 2) )

      redirect(response.notification, 'addNotificationResponseReceivedListener');
    });

    return () => {
      isMounted = false;
      Notifications.removeNotificationSubscription(subscription);
      subscription?.remove();
    };
  }, []);
}

export default function App() {
  const [expoPushToken, setExpoPushToken] = useState<string | undefined>('');
  const [notification, setNotification] = useState<Notifications.Notification>();
  
  const notificationListener = useRef<Notifications.Subscription | null>();
  const responseListener = useRef<Notifications.Subscription | null>();

  useNotificationObserver();

  useEffect(() => {
    registerForPushNotificationsAsync().then(token => setExpoPushToken(token));

    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      setNotification(notification);
    });

    // responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
    //   console.log('NOTIFICATION CLICKED> ', JSON.stringify(response.notification.request.content.data, null, 2) )
    // });

    return () => {
      notificationListener.current && Notifications.removeNotificationSubscription(notificationListener.current);
      // responseListener.current && Notifications.removeNotificationSubscription(responseListener.current);
    };
  }, []);

  return (
    <View style={styles.container}>
      <Text>Open up App.tsx to start working on your app!</Text>
      <Button title='Teste debug' onPress={() => {
          console.log('testando')
        }} />
      <StatusBar style="auto" />

      <Text>Your expo push token: {expoPushToken}</Text>
      <View style={{ alignItems: 'center', justifyContent: 'center' }}>
        <Text>Version: {ver} </Text>
        <Text>Title: {notification && notification.request.content.title} </Text>
        <Text>Body: {notification && notification.request.content.body}</Text>
        <Text>Data: {notification && JSON.stringify(notification.request.content.data)}</Text>
      </View>
      <Button
        title="Press to Send Notification"
        onPress={async () => {
          expoPushToken && await sendPushNotification(expoPushToken);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

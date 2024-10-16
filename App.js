import React, { Component, useState, useEffect } from 'react';
import { Text, View, StyleSheet, Alert } from 'react-native';
import Constants from 'expo-constants';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import * as SQLite from 'expo-sqlite';

import Search from './components/Search';
import Favorites from './components/Favorites';
import Exercises from './components/Exercises';

const db = SQLite.openDatabase('db.testDb');
const Tab = createBottomTabNavigator();

class App extends Component {
  state = {
    /* Default values, also refreshed on start via REST API */
    categories: [
      { label: 'Select item', value: null },
      { label: 'Abs', value: '10' },
      { label: 'Arms', value: '8' },
      { label: 'Back', value: '12' },
      { label: 'Calves', value: '14' },
      { label: 'Chest', value: '11' },
      { label: 'Legs', value: '9' },
      { label: 'Shoulders', value: '13' },
    ],
    equipment: [
      { label: 'Select item', value: null },
      { label: 'Barbell', value: '1' },
      { label: 'Bench', value: '8' },
      { label: 'Dumbell', value: '3' },
      { label: 'Gym mat', value: '4' },
      { label: 'Incline bench', value: '9' },
      { label: 'Kettlebell', value: '10' },
      { label: 'none (bodyweight exercise)', value: '7' },
      { label: 'Pull-up bar', value: '6' },
      { label: 'Swiss Ball', value: '5' },
      { label: 'SZ-Bar', value: '2' },
    ],
  };

  constructor(props) {
    super(props);
  }

  // get categories and equipment via REST API and make sure the SQL tablles exist
  componentDidMount() {
    try {
      this.getCategories();
      this.getEquipment();
      db.transaction((tx) => {
        tx.executeSql(
          'create table if not exists exercises (id integer primary key autoincrement, name text, description text, date integer, location text, weight text);'
        , null, null, (txObj, error) => Alert.alert('Error creating table ' + error));
      });
      db.transaction((tx) => {
        tx.executeSql(
          'create table if not exists favorites (id integer primary key autoincrement, name text, description text, exerciseid text, category text, equipment text);'
          , null, null, (txObj, error) => Alert.alert('Error creating table ' + error)
        );
      });
    } catch (error) {
      Alert.alert('Error ' + error);
    }
  }

  /* Refersh categories via REST API */
  async getCategories() {
    const response = await fetch('https://wger.de/api/v2/exercisecategory/');
    const json = await response.json();
    let newCategories = [{ label: 'Select item', value: null }];
    for (let i = 0; i < json.results.length; i++) {
      newCategories.push({
        label: json.results[i].name,
        value: json.results[i].id,
      });
    }
    this.setState({
      categories: newCategories,
    });
  }

  /* Refersh equipment via REST API */
  async getEquipment() {
    const response = await fetch('https://wger.de/api/v2/equipment/');
    const json = await response.json();
    let newEquipment = [{ label: 'Select item', value: null }];
    for (let i = 0; i < json.results.length; i++) {
      newEquipment.push({
        label: json.results[i].name,
        value: json.results[i].id,
      });
    }
  }

  /* Display tabs in bottom navigation container with icons */
  render() {
    return (
      <NavigationContainer>
        <Tab.Navigator>
        <Tab.Screen
            name="My Exercise Log"
            children={() => (
              <Exercises
                db={db}
                categories={this.state.categories}
                equipment={this.state.equipment}
              />
            )}
            options={{
              unmountOnBlur: true,
              tabBarLabel: 'Exercise Log',
              tabBarIcon: ({ color, size }) => (
                <MaterialCommunityIcons
                  name="arm-flex"
                  color={color}
                  size={size}
                />
              ),
            }}
          />
           <Tab.Screen
            name="My Favorite Exercises"
            children={() => (
              <Favorites
                db={db}
                categories={this.state.categories}
                equipment={this.state.equipment}
              />
            )}
            options={{
              unmountOnBlur: true,
              tabBarLabel: 'Favorites',
              tabBarIcon: ({ color, size }) => (
                <MaterialCommunityIcons
                  name="cards-heart"
                  color={color}
                  size={size}
                />
              ),
            }}
          />
          <Tab.Screen
            name="Search Exercises"
            children={() => (
              <Search
                db={db}
                categories={this.state.categories}
                equipment={this.state.equipment}
              />
            )}
            options={{
              unmountOnBlur: true,
              tabBarLabel: 'Search',
              tabBarIcon: ({ color, size }) => (
                <MaterialCommunityIcons
                  name="magnify"
                  color={color}
                  size={size}
                />
              ),
            }}
          />
        </Tab.Navigator>
      </NavigationContainer>
    );
  }
}

export default App;

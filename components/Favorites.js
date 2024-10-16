import React, { Component, useState, useEffect } from 'react';
import {
  Text,
  View,
  StyleSheet,
  TextInput,
  Platform,
  ActivityIndicator,
  FlatList,
  Alert,
} from 'react-native';
import { Dropdown } from 'react-native-element-dropdown';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Icon from 'react-native-vector-icons/FontAwesome';
import { Button } from '@rneui/base';
import * as SQLite from 'expo-sqlite';
import LogExercise from './LogExercise';

/* Class for displaying the favorites and allowing logging more exercises and removing a favorite */
class Favorites extends Component {
  state = {
    data: [],
  };

  /* Remove an exercise from favorites and refresh the list */
  deleteFavorite(id) {
    this.db.transaction((tx) => {
      tx.executeSql(
        'DELETE FROM favorites WHERE exerciseid = ? ',
        [id],
        (txObj, resultSet) => {
          if (resultSet.rowsAffected > 0) {
            let newList = this.state.data.filter((data) => {
              if (data.exerciseid == id) return false;
              else return true;
            });
            this.setState({ data: newList });
          }
        }
      );
    });
  }

  /* Query favorites from database */
  queryFavorites() {
    this.db.transaction((tx) => {
      tx.executeSql(
        'SELECT * FROM favorites ORDER BY name',
        null,
        (txObj, { rows: { _array } }) => this.setState({ data: _array })
      );
    });
  }

  constructor(props) {
    super(props);
    this.db = props.db;
  }
  
  /* Map category label from key */
  getCategoryName(key) {
    for (let i = 0; i < this.props.categories.length; i++) {
      if (this.props.categories[i].value == '' + key) {
        return this.props.categories[i].label;
      }
    }
    return '' + key;
  }

  /* Map equipment label(s) from key */
  getEquipmentName(key) {
    let localKey = '' + key;
    if (localKey.includes(',')) {
      localKey = localKey.split(',');
    } else {
      localKey = [localKey];
    }
    let equipmentNames = '';
    for (let j = 0; j < localKey.length; j++) {
      for (let i = 0; i < this.props.equipment.length; i++) {
        if (this.props.equipment[i].value == '' + localKey[j]) {
          if (equipmentNames != '') {
            equipmentNames += '+' + this.props.equipment[i].label;
          } else {
            equipmentNames += this.props.equipment[i].label;
          }
        }
      }
    }
    return equipmentNames;
  }

  //Setter for modal visible to log exercises
  setModalVisible(value, item) {
    if (value == true) {
      try {
        this.setState({
          modalVisible: value,
          selectedExercise: item == null ? this.state.selectedExercise : item,
        });
      } catch (error) {
        Alert.alert('Error ' + error);
      }
    } else {
      try {
        this.setState({
          modalVisible: value,
        });
      } catch (error) {
        Alert.alert('Error ' + error);
      }
    }
  }

  componentDidMount() {
    this.queryFavorites();
  }

  // main function to render the component
  render() {
    //UI components
    return (
      <View style={styles.container}>
        {this.state.modalVisible ? (
          <LogExercise
            db={this.db}
            selectedExercise={this.state.selectedExercise}
            modalVisible={this.state.modalVisible}
            setModalVisible={this.setModalVisible.bind(this)}
          />
        ) : null}
        {/* List of favorites with log and remove favorite buttons */}
        <FlatList
          data={this.state.data}
          keyExtractor={({ id }, index) => id}
          renderItem={({ item }) => (
            <View style={styles.listItem}>
              <Text style={styles.listHeading}>{item.name}</Text>
              <Text style={styles.listContent}>
                {this.getEquipmentName(item.equipment)}{' '}
                {this.getCategoryName(item.category)}
              </Text>
              <View style={styles.row}>
                <MaterialCommunityIcons
                  name="arm-flex"
                  style={styles.iconButton}
                  size={24}
                  onPress={() => this.setModalVisible(true, item)}>
                  <Text style={styles.iconLabel}>Log</Text>
                </MaterialCommunityIcons>
                <MaterialCommunityIcons
                  name="trash-can-outline"
                  style={styles.iconButton}
                  size={24}
                  onPress={() => this.deleteFavorite(item.exerciseid)}>
                  <Text style={styles.iconLabel}>Remove</Text>
                </MaterialCommunityIcons>
              </View>
            </View>
          )}
        />
      </View>
    );
  }
}

//Stylesheet for the app. The font sizes and some alignment are platform specific
const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    backgroundColor: 'white',
  },
  iconLabel: {
    paddingHorizontal: 4,
    ...Platform.select({
      ios: {
        color: '#8A8A8E',
        fontSize: 15,
      },
      android: {
        fontSize: 14,
      },
      default: {
        fontSize: 14,
      },
    }),
  },
  listHeading: {
    textAlign: 'left',
    fontWeight: 'bold',
    ...Platform.select({
      ios: {
        fontSize: 17,
      },
      android: {
        fontSize: 16,
      },
      default: {
        fontSize: 16,
      },
    }),
  },
  listItem: {
    borderBottomColor: 'black',
    borderBottomWidth: 1,
    marginBottom: 8,
  },
  listContent: {
    textAlign: 'left',
    borderBottom: '',
    ...Platform.select({
      ios: {
        fontSize: 15,
      },
      android: {
        fontSize: 14,
      },
      default: {
        fontSize: 14,
      },
    }),
  },
  iconButton: {
    borderColor: 'gray',
    borderWidth: 0.5,
    borderRadius: 8,
    padding: 4,
    marginRight: 16,
    marginBottom: 16,
  },
  row: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'space-between',
    paddingTop: 16,
  },
});

export default Favorites;

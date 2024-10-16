import React, { Component, useState, useEffect } from 'react';
import {
  Text,
  ScrollView,
  View,
  StyleSheet,
  TextInput,
  Platform,
  Modal,
  Alert,
} from 'react-native';
import Constants from 'expo-constants';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Icon from 'react-native-vector-icons/FontAwesome';
import { Button } from '@rneui/base';
import HTMLView from 'react-native-htmlview';
import * as Location from 'expo-location';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as SQLite from 'expo-sqlite';

/* Class for logging exercises and retrieving user's location, modal window */
class LogExercise extends Component {
  state = {
    weight: null,
    reps: null,
    date: new Date(),
    address: null,
    latitude: null,
    longitude: null,
    showDatePicker: false,
  };

  // setter for weight
  setWeight(value) {
    this.setState({ weight: value });
  }

  // setter for address
  setAddress(value) {
    this.setState({ address: value });
  }

  // setter for date
  displayDatePicker() {
    this.setState({ showDatePicker: true });
  }

  // setter for date
  setDate(value, event) {
    this.setState({
      date: value != null ? value : this.state.date,
      showDatePicker: false,
    });
  }

  // setter for reps
  setReps(value) {
    this.setState({ reps: value });
  }

  constructor(props) {
    super(props);
    this.db = props.db;
  }

  /* Function to get location from device if granted and reverse geocode it via REST API */
  async getLocation() {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      return;
    }
    let location = await Location.getCurrentPositionAsync({});
    if (location != undefined && location.coords != undefined) {
      this.setState({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
      try {
        const response = await fetch(
          'https://nominatim.openstreetmap.org/reverse?lat=' +
            location.coords.latitude +
            '&lon=' +
            location.coords.longitude +
            '&format=jsonv2'
        );
        const json = await response.json();
        const newAddress =
          json.address.road +
          ' ' +
          json.address.house_number +
          ' ' +
          json.address.city;
        this.setState({ address: newAddress });
      } catch (error) {
        Alert.alert(error);
      }
    }
  }

  /* Log and exercise, note that saving keeps the modal open 
  to allow logging multiple sets of the same exercise */
  saveExercise() {
    if (
      !this.state.date ||
      !this.state.weight ||
      !this.state.reps ||
      !this.state.address
    ) {
      Alert.alert('Please fill all fields');
      return;
    }
    try {
      let d = this.state.date,
        month = '' + (d.getMonth() + 1),
        day = '' + d.getDate(),
        year = d.getFullYear();

      if (month.length < 2) month = '0' + month;
      if (day.length < 2) day = '0' + day;

      d = [year, month, day].join('-');
      this.db.transaction((tx) => {
        tx.executeSql(
          'SELECT * FROM exercises WHERE location = ? AND date = ? and name = ?',
          [this.state.address, d, this.props.selectedExercise.name],
          (txObj, { rows: { _array } }) => {
            if (_array.length > 0) {
              let newWeight =
                _array[0].weight +
                '\n' +
                this.state.weight +
                ' kg x ' +
                this.state.reps;

              this.db.transaction((tx) => {
                tx.executeSql(
                  'UPDATE exercises SET weight = ? WHERE id = ?',
                  [newWeight, _array[0].id],
                  (tx, results) => {
                    Alert.alert('Exercise was updated');
                  },
                  (tx, error) => Alert.alert('Error callback ' + error)
                );
              });
            } else {
              this.db.transaction((tx) => {
                tx.executeSql(
                  'insert into exercises (name, description, location, weight, date) values (?, ?, ?, ?, ?)',
                  [
                    this.props.selectedExercise.name,
                    this.props.selectedExercise.description,
                    this.state.address,
                    this.state.weight + ' kg x ' + this.state.reps,
                    d,
                  ],
                  (tx, results) => Alert.alert('Exercise was created'),
                  (transaction, error) => Alert.alert('Error callback ' + error)
                );
              });
            }
          },
          (txObj, error) => console.log('Error ', error)
        );
      });
    } catch (error) {
      Alert.alert('Error save exercise' + error);
    }
  }

  componentDidMount() {
    this.getLocation();
  }

  // main function to render the component
  render() {
    //UI components
    return (
      <Modal
        animationType="slide"
        transparent={false}
        visible={this.props.modalVisible}
        onRequestClose={() => {
          this.props.setModalVisible(false);
        }}>
        <View style={styles.containerModal}>
          <Text style={styles.heading}>
            Log {this.props.selectedExercise.name} Exercise
          </Text>
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              {/* Weight input */}
              <Text style={styles.fieldLabel}>Weight (kg)</Text>
              <TextInput
                onChangeText={(weight) => this.setWeight(weight)}
                placeholder={'Enter weight'}
                keyboardType={'number-pad'}
                value={this.state.weight}
                style={styles.input}
              />
            </View>
            {/* Reps input */}
            <View style={styles.rowRight}>
              <Text style={styles.fieldLabel}>Reps</Text>
              <TextInput
                onChangeText={(reps) => this.setReps(reps)}
                placeholder={'Enter repetitions'}
                keyboardType={'number-pad'}
                value={this.state.reps}
                style={styles.input}
              />
            </View>
          </View>
          {/* Date input */}
          <Text style={styles.fieldLabelTopPadding}>Date</Text>
          <MaterialCommunityIcons
            name="calendar"
            style={styles.datePicker}
            size={24}
            onPress={() => this.displayDatePicker()}>
            <Text style={styles.datePickerText}>
              &nbsp;
              {this.state.date != null
                ? this.state.date.toDateString()
                : 'Select date'}
            </Text>
          </MaterialCommunityIcons>
          {this.state.showDatePicker ? (
            <DateTimePicker
              value={this.state.date}
              onChange={(event, date) => this.setDate(date, event)}
            />
          ) : null}
          {/* Location input to allow manual override or entering the location if GPS is not available*/}
          <Text style={styles.fieldLabelTopPadding}>Location</Text>
          <TextInput
            style={styles.input}
            value={this.state.address}
            onChangeText={(address) => this.setAddress(address)}
          />
          {this.state.latitude != null ? (
            <Text style={styles.fieldLabel}>
              (Latitude: {this.state.latitude}, Longitude:{' '}
              {this.state.longitude})
            </Text>
          ) : null}
          {/* The buttons to save and close the modal */}
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Button
                title="Save"
                onPress={() => {
                  this.saveExercise();
                }}
              />
            </View>
            <View style={styles.rowRight}>
              <Button
                title="Close"
                onPress={() => this.props.setModalVisible(false)}
                type="outline"
              />
            </View>
          </View>
          <Text style={styles.heading}>Exercise Instructions</Text>
          <ScrollView>
            <HTMLView value={this.props.selectedExercise.description} />
          </ScrollView>
        </View>
      </Modal>
    );
  }
}

//Stylesheet for the app. The font sizes and some alignment are platform specific
const styles = StyleSheet.create({
  containerModal: {
    flex: 1,
    padding: 16,
    paddingTop: Constants.statusBarHeight,
    backgroundColor: 'white',
  },
  input: {
    height: 50,
    padding: 10,
    backgroundColor: 'white',
    borderColor: 'gray',
    borderWidth: 0.5,
    borderRadius: 8,
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
  heading: {
    marginTop: 16,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        fontSize: 34,
        fontWeight: 'bold',
        textAlign: 'left',
      },
      android: {
        fontSize: 20,
        fontWeight: 'bold',
        textAlign: 'center',
      },
      default: {
        fontSize: 20,
        fontWeight: 'bold',
        textAlign: 'center',
      },
    }),
  },
  fieldLabel: {
    paddingBottom: 4,
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
  fieldLabelTopPadding: {
    paddingBottom: 4,
    paddingTop: 8,
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
  datePicker: {
    borderColor: 'gray',
    borderWidth: 0.5,
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingTop: 16,
    paddingBottom: 16,
  },
  datePickerText: {
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
  row: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'space-between',
    paddingTop: 16,
  },
  rowLeft: { width: '50%', paddingRight: 8 },
  rowRight: { width: '50%', paddingLeft: 8 },
});

export default LogExercise;

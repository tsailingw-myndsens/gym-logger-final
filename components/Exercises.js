import React, { Component, useState, useEffect } from 'react';
import {
  Text,
  View,
  StyleSheet,
  Platform,
  FlatList,
  Alert,
  Modal,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Icon from 'react-native-vector-icons/FontAwesome';
import { Button } from '@rneui/base';
import * as SQLite from 'expo-sqlite';
import LogExercise from './LogExercise';
import DateTimePicker from '@react-native-community/datetimepicker';
import Constants from 'expo-constants';

/* Class for viewing logged exercises and logging more */
class Exercises extends Component {
  state = {
    data: [],
    dateFrom: new Date(),
    dateUntil: new Date(),
    showDateFromPicker: false,
    showDateUntilPicker: false,
    filterVisible: false,
    filterByDateFrom: null,
    filterByDateUntil: null,
  };

  //Display filter
  setFilterVisible(value) {
    this.setState({
      filterVisible: value,
    });
  }

  //Filter and close modal
  filterExercises() {
    this.setState(
      {
        filterVisible: false,
        filterByDateFrom: this.state.dateFrom,
        filterByDateUntil: this.state.dateUntil,
      },
      () => this.queryExercises()
    );
  }

  // setter for date from
  displayDateFromPicker() {
    this.setState({ showDateFromPicker: true });
  }

  // setter for date from
  setFromDate(value) {
    this.setState({
      dateFrom: value != null ? value : this.state.dateFrom,
      showDateFromPicker: false,
    });
  }

  // setter for date until
  displayDateUntilPicker() {
    this.setState({ showDateUntilPicker: true });
  }

  // setter for date until
  setUntilDate(value) {
    this.setState({
      dateUntil: value != null ? value : this.state.dateUntil,
      showDateUntilPicker: false,
    });
  }

  //clears filter
  clearFilter() {
    this.setState({ filterByDateFrom: null, filterByDateUntil: null }, () =>
      this.queryExercises()
    );
  }

  //helper to convert a date to database format
  formatDate(date) {
    let d = date,
      month = '' + (d.getMonth() + 1),
      day = '' + d.getDate(),
      year = d.getFullYear();

    if (month.length < 2) month = '0' + month;
    if (day.length < 2) day = '0' + day;

    return [year, month, day].join('-');
  }

  /* Query all exercises matching the filter (if defined) */
  queryExercises() {
    if (
      this.state.filterByDateFrom != null ||
      this.state.filterByDateUntil != null
    ) {
      let d1 = this.formatDate(this.state.dateFrom),
        d2 = this.formatDate(this.state.dateUntil);
      this.db.transaction((tx) => {
        tx.executeSql(
          'SELECT * FROM exercises WHERE date >= ? AND date <= ? ORDER BY date DESC, location, name',
          [d1, d2],
          (txObj, { rows: { _array } }) => {
            this.setState({ data: _array });
          }
        );
      });
    } else {
      this.db.transaction((tx) => {
        tx.executeSql(
          'SELECT * FROM exercises ORDER BY date DESC, location, name',
          null,
          (txObj, { rows: { _array } }) => {
            this.setState({ data: _array });
          }
        );
      });
    }
  }

  constructor(props) {
    super(props);
    this.db = props.db;
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
        this.queryExercises();
      } catch (error) {
        Alert.alert('Error ' + error);
      }
    }
  }

  componentDidMount() {
    this.queryExercises();
  }

  // main function to render the component
  render() {
    //UI components
    return (
      <View style={styles.container}>
        {/*Modal for filtering*/}
        {this.state.filterVisible ? (
          <Modal
            animationType="slide"
            transparent={false}
            visible={this.state.filterVisible}
            onRequestClose={() => {
              this.setFilterVisible(false);
            }}>
            <View style={styles.containerModal}>
              <Text style={styles.heading}>Filter</Text>
              {/* Date input */}
              <Text style={styles.fieldLabelTopPadding}>Date From</Text>
              <MaterialCommunityIcons
                name="calendar"
                style={styles.datePicker}
                size={24}
                onPress={() => this.displayDateFromPicker()}>
                <Text style={styles.datePickerText}>
                  &nbsp;
                  {this.state.dateFrom != null
                    ? this.state.dateFrom.toDateString()
                    : 'Specify date'}
                </Text>
              </MaterialCommunityIcons>
              {this.state.showDateFromPicker ? (
                <DateTimePicker
                  value={this.state.dateFrom}
                  onChange={(event, date) => this.setFromDate(date)}
                />
              ) : null}
              {/* Date input */}
              <Text style={styles.fieldLabelTopPadding}>Date Until</Text>
              <MaterialCommunityIcons
                name="calendar"
                style={styles.datePicker}
                size={24}
                onPress={() => this.displayDateUntilPicker()}>
                <Text style={styles.datePickerText}>
                  &nbsp;
                  {this.state.dateUntil != null
                    ? this.state.dateUntil.toDateString()
                    : 'Specify date'}
                </Text>
              </MaterialCommunityIcons>
              {this.state.showDateUntilPicker ? (
                <DateTimePicker
                  value={this.state.dateUntil}
                  onChange={(event, date) => this.setUntilDate(date)}
                />
              ) : null}
              <View style={styles.row}>
                <View style={styles.rowLeft}>
                  <Button
                    title="Filter"
                    onPress={() => {
                      this.filterExercises();
                    }}
                  />
                </View>
                <View style={styles.rowRight}>
                  <Button
                    title="Cancel"
                    onPress={() => this.setFilterVisible(false)}
                    type="outline"
                  />
                </View>
              </View>
            </View>
          </Modal>
        ) : null}
        {this.state.modalVisible ? (
          <LogExercise
            db={this.db}
            selectedExercise={this.state.selectedExercise}
            modalVisible={this.state.modalVisible}
            setModalVisible={this.setModalVisible.bind(this)}
          />
        ) : null}
        {/* Display a list of exercises or encouragement to search and log workouts if the list is empty */}
        <View style={styles.row}>
          <View style={styles.rowLeft}>
            <Button
              title="Filter"
              onPress={() => this.setFilterVisible(true)}
            />
          </View>
          <View style={styles.rowLeft}>
            <Button
              title="Clear Filter"
              onPress={() => this.clearFilter()}
              type="outline"
            />
          </View>
        </View>
        {this.state.filterByDateFrom != null ? (
          <Text>
            Showing {this.state.filterByDateFrom.toDateString()} -{' '}
            {this.state.filterByDateUntil.toDateString()}
          </Text>
        ) : null}
        {this.state.data.length > 0 ? (
          <FlatList
            data={this.state.data}
            keyExtractor={({ id }, index) => id}
            renderItem={({ item }) => (
              <View style={styles.listItem}>
                <Text style={styles.listHeading}>
                  {item.date} {item.location}
                </Text>
                <Text style={styles.listHeading}>{item.name}</Text>
                <Text style={styles.listContent}>{item.weight}</Text>
                <View style={styles.row}>
                  <MaterialCommunityIcons
                    name="arm-flex"
                    style={styles.iconButton}
                    size={24}
                    onPress={() => this.setModalVisible(true, item)}>
                    <Text style={styles.iconLabel}>Log</Text>
                  </MaterialCommunityIcons>
                </View>
              </View>
            )}
          />
        ) : (
          <View>
            <Text style={styles.listHeading}>No logged exercises found.</Text>
            <Text style={styles.listHeading}>
              Search exercises and log your workout!
            </Text>
          </View>
        )}
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
  rowLeft: { width: '50%', paddingRight: 8 },
  rowRight: { width: '50%', paddingLeft: 8 },
  containerModal: {
    flex: 1,
    padding: 16,
    paddingTop: Constants.statusBarHeight,
    backgroundColor: 'white',
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
});

export default Exercises;

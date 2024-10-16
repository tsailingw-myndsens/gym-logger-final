import React, { Component, useState, useEffect } from 'react';
import {
  Text,
  View,
  StyleSheet,
  TextInput,
  Platform,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Dropdown } from 'react-native-element-dropdown';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Icon from 'react-native-vector-icons/FontAwesome';
import { Button } from '@rneui/base';
import * as SQLite from 'expo-sqlite';
import LogExercise from './LogExercise';

/* Class for searching and displaying exercises */
class Search extends Component {
  state = {
    // variables for search parameters, filled from changes in input elements
    categoryValue: null,
    isCategoryFocus: false,
    equipmentValue: null,
    isEquipmentFocus: false,
    exercise: '',
    exerciseSearchResult: [],
    isLoading: false,
    isLoadingMore: false,
    resultCount: null,
    nextSearch: null,
    modalVisible: false,
    selectedExercise: {
      name: '',
      description: '',
    },
    data: [],
  };

  // setter for category state variable
  setCategoryValue(value) {
    this.setState({ categoryValue: value });
  }

  // setter for category focus state variable
  setIsCategoryFocus(value) {
    this.setState({ isCategoryFocus: value });
  }

  // setter for equipment state variable
  setEquipmentValue(value) {
    this.setState({ equipmentValue: value });
  }

  // setter for equipment state variable
  setIsEquipmentFocus(value) {
    this.setState({ isEquipmentFocus: value });
  }

  // setter for exercise state variable
  setExercise(value) {
    this.setState({ exercise: value });
  }

  //query favoritesand mark the search results as favorites if they are such
  addFavoritesToSearchResult(result) {
    let fullResults = [];
    let ids = [];
    if (result != null) {
      for (let i = 0; i < result.length; i++) {
        ids.push('' + result[i].id);
        fullResults.push({
          id: '' + result[i].id,
          name: result[i].name,
          description: result[i].description,
          category: result[i].category,
          equipment: result[i].equipment,
          isFavorite: false,
        });
      }
      try {
        this.db.transaction((tx) => {
          tx.executeSql(
            'SELECT exerciseid FROM favorites',
            null,
            (txObj, { rows: { _array } }) => {
              for (let j = 0; j < ids.length; j++) {
                for (let k = 0; k < _array.length; k++) {
                  if (
                    _array[k].exerciseid == '' + ids[j]
                  ) {
                    fullResults[j].isFavorite = true;
                    break;
                  }
                }
              }
            },
            (txObj, error) => Alert.alert('Error query favorites in Search ' + error)
          );
        });
      } catch (error) {
        Alert.alert('Error query favorites' + error);
      }
    }
    return fullResults;
  }

  // Fetches data from REST API according to the search parameters
  async executeSearch() {
    try {
      let url = 'https://wger.de/api/v2/exercise/?language=2';
      if (this.state.categoryValue != null) {
        url += '&category=' + this.state.categoryValue;
      }
      if (this.state.equipmentValue != null) {
        url += '&equipment=' + this.state.equipmentValue;
      }
      if (this.state.exercise != null) {
        url += '&name=' + this.state.exercise;
      }
      this.setState({ isLoading: true });
      const response = await fetch(url);
      const json = await response.json();
      this.setState({
        exerciseSearchResult: this.addFavoritesToSearchResult(json.results),
        resultCount: json.count,
        nextSearch: json.next,
      });
    } catch (error) {
      console.log(error);
    } finally {
      this.setState({ isLoading: false });
      this.flatListRef.scrollToOffset({ animated: true, offset: 0 });
    }
  }

  // Fetches more data from REST API according to the search parameters
  async searchMore() {
    if (
      this.state.nextSearch != null &&
      !this.state.isLoading &&
      !this.state.isLoadingMore
    ) {
      try {
        this.setState({ isLoadingMore: true });
        const response = await fetch(this.state.nextSearch);
        const json = await response.json();
        this.setState({
          exerciseSearchResult: [
            ...this.state.exerciseSearchResult,
            ...(this.addFavoritesToSearchResult(json.results)),
          ],
          resultCount: json.count,
          nextSearch: json.next,
        });
      } catch (error) {
        console.log(error);
      } finally {
        this.setState({ isLoadingMore: false });
      }
    }
  }

  // convenience function to clear search parameters
  clearSearch() {
    this.setState({
      exercise: '',
      categoryValue: null,
      equipmentValue: null,
      exerciseSearchResult: [],
      resultCount: null,
      nextSearch: null,
    });
  }

  //Removes an exercise from favorites
  deleteFavorite(id) {
    this.db.transaction((tx) => {
      tx.executeSql(
        'DELETE FROM favorites WHERE exerciseid = ? ',
        [id],
        (txObj, resultSet) => {
          if (resultSet.rowsAffected > 0) {
            let newResultSet = this.state.exerciseSearchResult;
            for (let i = 0; i < newResultSet.length; i++) {
              if (newResultSet[i].id == '' + id) {
                newResultSet[i].isFavorite = false;
              }
            }
            this.setState({
              exerciseSearchResult: newResultSet,
            });
          }
        }
      );
    });
  }

  //Saves exercise as a favorite
  saveFavorite(exercise) {
    this.db.transaction((tx) => {
      tx.executeSql(
        'INSERT INTO favorites (name, description, exerciseid, equipment, category) values (?, ?, ?, ?, ?)',
        [
          exercise.name,
          exercise.description,
          '' + exercise.id,
          '' + exercise.equipment,
          '' + exercise.category,
        ],
        (txObj, resultSet) => {
          let newResultSet = this.state.exerciseSearchResult;
          for (let i = 0; i < newResultSet.length; i++) {
            if (newResultSet[i].id == '' + exercise.id) {
              newResultSet[i].isFavorite = true;
            }
          }
          this.setState({
            exerciseSearchResult: newResultSet,
          });
        },
        (txObj, error) => console.log('Error', error)
      );
    });
  }

  constructor(props) {
    super(props);
    this.db = props.db;
  }

  //Displays label based on the key
  getCategoryName(key) {
    for (let i = 0; i < this.props.categories.length; i++) {
      if (this.props.categories[i].value == '' + key) {
        return this.props.categories[i].label;
      }
    }
    return '' + key;
  }

  //Displays label(s) based on the key
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

  //Setter for modal visible for logging exercises
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
        {/* Exercise input */}
        <Text style={styles.fieldLabel}>Exercise Name</Text>
        <TextInput
          onChangeText={(exercise) => this.setExercise(exercise)}
          placeholder={'Exercise'}
          value={this.state.exercise}
          style={styles.input}
        />
        <View style={styles.row}>
          {/* Equipment dropdown */}
          <View style={styles.rowLeft}>
            <Text style={styles.fieldLabel}>Equipment</Text>
            <Dropdown
              style={[
                styles.dropdown,
                this.isEquipmentFocus && { borderColor: 'blue' },
              ]}
              placeholderStyle={styles.placeholderStyle}
              selectedTextStyle={styles.selectedTextStyle}
              inputSearchStyle={styles.inputSearchStyle}
              data={this.props.equipment}
              maxHeight={300}
              labelField="label"
              valueField="value"
              placeholder={!this.isEquipmentFocus ? 'Select item' : '...'}
              value={this.state.equipmentValue}
              onFocus={() => this.setIsEquipmentFocus(true)}
              onBlur={() => this.setIsEquipmentFocus(false)}
              onChange={(item) => {
                this.setEquipmentValue(item.value);
                this.setIsEquipmentFocus(false);
              }}
            />
          </View>
          <View style={styles.rowRight}>
            {/* Category dropdown */}
            <Text style={styles.fieldLabel}>Category</Text>
            <Dropdown
              style={[
                styles.dropdown,
                this.isCategoryFocus && { borderColor: 'blue' },
              ]}
              placeholderStyle={styles.placeholderStyle}
              selectedTextStyle={styles.selectedTextStyle}
              data={this.props.categories}
              maxHeight={300}
              labelField="label"
              valueField="value"
              placeholder={!this.isCategoryFocus ? 'Select item' : '...'}
              value={this.state.categoryValue}
              onFocus={() => this.setIsCategoryFocus(true)}
              onBlur={() => this.setIsCategoryFocus(false)}
              onChange={(item) => {
                this.setCategoryValue(item.value);
                this.setIsCategoryFocus(false);
              }}
            />
          </View>
        </View>

        {/* The buttons search and clear the search criteria and results*/}
        <View style={styles.row}>
          <View style={styles.rowLeft}>
            <Button title="Search" onPress={() => this.executeSearch()} />
          </View>
          <View style={styles.rowRight}>
            <Button
              title="Clear"
              onPress={() => this.clearSearch()}
              type="outline"
            />
          </View>
        </View>
        {/* Search result count */}
        {this.state.resultCount != null ? (
          <Text style={styles.heading}>
            Search Results ({this.state.exerciseSearchResult.length}
            &nbsp;/&nbsp;
            {this.state.resultCount})
          </Text>
        ) : null}
        {/* Spinner or search results after loading*/}
        {this.state.isLoading ? (
          <ActivityIndicator />
        ) : (
          <FlatList
            data={this.state.exerciseSearchResult}
            keyExtractor={({ id }, index) => id}
            initialNumToRender={8}
            onEndReached={() => {
              this.searchMore();
            }}
            onEndReachedThreshold={0.5}
            ref={(ref) => {
              this.flatListRef = ref;
            }}
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
                  {item.isFavorite ? (
                    <MaterialCommunityIcons
                      name="heart"
                      style={styles.iconButton}
                      size={24}
                      onPress={() => this.deleteFavorite(item.id)}>
                      <Text style={styles.iconLabel}>Remove Favorite</Text>
                    </MaterialCommunityIcons>
                  ) : (
                    <MaterialCommunityIcons
                      name="heart-outline"
                      style={styles.iconButton}
                      size={24}
                      onPress={() => this.saveFavorite(item)}>
                      <Text style={styles.iconLabel}>&nbsp;Favorite</Text>
                    </MaterialCommunityIcons>
                  )}
                </View>
              </View>
            )}
          />
        )}
        {/* Spinner for searching more */}
        {this.state.isLoadingMore ? <ActivityIndicator /> : null}
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
  dropdown: {
    height: 50,
    borderColor: 'gray',
    borderWidth: 0.5,
    borderRadius: 8,
    paddingHorizontal: 8,
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
  placeholderStyle: {
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
  selectedTextStyle: {
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
});

export default Search;

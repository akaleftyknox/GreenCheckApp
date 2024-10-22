import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import Modal from 'react-native-modal';

type Props = React.PropsWithChildren<{
  isVisible: boolean;
  onClose: () => void;
}>;

const { height } = Dimensions.get('window');

export default function IngredientResults({ isVisible, children, onClose }: Props) {
  return (
    <Modal
      isVisible={isVisible}
      onBackdropPress={onClose}
      onSwipeComplete={onClose}
      swipeDirection="down"
      style={styles.modal}
      backdropTransitionOutTiming={0}
      animationIn="slideInUp"
      animationOut="slideOutDown"
    >
      <View style={styles.modalContent}>
        <View style={styles.sheetHeader}>
          <View style={{ width: 60 }} />
          <Text style={styles.sheetHeaderTitle}>Ingredient Results</Text>
          <TouchableOpacity onPress={onClose}>
            <View style={{ width: 60, alignItems: 'flex-end' }}>
              <Text style={styles.done}>Done</Text>
            </View>
          </TouchableOpacity>
        </View>
        {children}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modal: {
    justifyContent: 'flex-end',
    margin: 0,
  },
  modalContent: {
    height: height * 0.8, // 80% of screen height
    width: '100%',
    backgroundColor: '#25292e',
    borderTopRightRadius: 18,
    borderTopLeftRadius: 18,
    paddingBottom: 20,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#efefef',
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  sheetHeaderTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
  },
  done: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ff6a55',
  },
});
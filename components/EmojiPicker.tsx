import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { PropsWithChildren } from 'react';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

type Props = PropsWithChildren<{
  isVisible: boolean;
  onClose: () => void;
}>;

export default function EmojiPicker({ isVisible, children, onClose }: Props) {
  return (
    <Modal animationType="slide" transparent={true} visible={isVisible}>
      <View style={styles.modalContent}>
        <View style={styles.sheetHeader}>
          <View style={{ width: 60 }} />
          <Text style={styles.sheetHeaderTitle}>Scan Results</Text>
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
  modalContent: {
    height: '25%',
    width: '100%',
    backgroundColor: '#25292e',
    borderTopRightRadius: 18,
    borderTopLeftRadius: 18,
    position: 'absolute',
    bottom: 0,
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
    color: '#fff', // Ensures the title remains visible against the dark background
  },
  done: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ff6a55',
  },
});

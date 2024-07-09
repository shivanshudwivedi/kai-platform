import {
  collection,
  getDocs,
  getFirestore,
  query,
  where,
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';

const functions = getFunctions();
const db = getFirestore();

const fetchChatHistory = async (userId) => {
  const fetchHistory = httpsCallable(functions, 'fetchChatHistory');
  const result = await fetchHistory({ userId });
  return result.data.data;
};

export { fetchChatHistory };

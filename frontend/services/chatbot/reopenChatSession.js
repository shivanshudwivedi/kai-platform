import { getFunctions, httpsCallable } from 'firebase/functions';

const functions = getFunctions();

const reopenChatSession = async (chatId) => {
  const reopenSession = httpsCallable(functions, 'reopenChatSession');
  const result = await reopenSession({ chatId });
  return result.data.data;
};

export { reopenChatSession };

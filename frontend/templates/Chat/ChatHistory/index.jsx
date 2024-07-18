// ChatHistory.js
import React, { useState } from 'react';
import { List, ListItem, ListItemText, Button } from '@mui/material';
import { styles } from './styles';
import { setChatSession, setSessionLoaded, resetChat } from '@/redux/slices/chatSlice';
import { useDispatch } from 'react-redux';
import { httpsCallable } from 'firebase/functions'; // Import httpsCallable
import { functions } from '@/redux/store'; // Ensure functions is exported from your store
import {
  OpenInFull,
  Minimize
} from '@mui/icons-material';



const truncateText = (text, maxLength) => {
  if (!text) return '';
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.substring(0, maxLength)}...`;
};

const convertTimestampToDate = (timestamp) => {
  if (!timestamp) return 'Invalid Date';

  let date;
  if (timestamp.seconds) {
    // Firebase Timestamp
    date = new Date(timestamp.seconds * 1000 + timestamp.nanoseconds / 1000000);
  } else {
    // ISO string or Date object
    date = new Date(timestamp);
  }

  if (isNaN(date.getTime())) {
    return 'Invalid Date';
  }

  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  return date.toLocaleDateString(undefined, options);
};

const ChatHistory = ({ history }) => {
  const [hoveredSession, setHoveredSession] = useState(null);
  const [display, setDisplay] = useState(true);
  const dispatch = useDispatch();

  if (!history) {
    return <div>No chat history available.</div>;
  }

  const handleChatSessionClick = async (id) => {
    dispatch(resetChat());

    const reopenChatSession = httpsCallable(functions, 'reopenChatSession');

    try {
      const result = await reopenChatSession({ chatId: id });
      const { data } = result.data;
      dispatch(setChatSession(data));
      dispatch(setSessionLoaded(true));
    } catch (error) {
      console.error('Error reopening chat session:', error);
    }
  };

  if (display) {
    return (
      <div style = {styles.mainContainer}>
        <List style={styles.sidebarContainer}>
          <div style = {styles.h2Container}>
            <h2 style={styles.h2}>Chat History</h2>
            <Button startIcon={<Minimize />} onClick={() => setDisplay(false)} />
          </div>
          {history.map((entry) => {

            return (
              <ListItem
                key={entry.id}
                style={{
                  ...styles.chatSession,
                  ...(hoveredSession === entry.id ? styles.chatSessionHover : {}),
                }}
                onMouseEnter={() => setHoveredSession(entry.id)}
                onMouseLeave={() => setHoveredSession(null)}
                onClick={() => handleChatSessionClick(entry.id)}
              >
                <ListItemText
                  primary={truncateText(entry.messages?.[0]?.payload?.text || '', 15)}
                  style={styles.chatSessionText}
                />
                <ListItemText
                  primary={convertTimestampToDate(entry.timestamp)}
                  style={styles.chatTimeText}
                />
              </ListItem>
            );
          })}
        </List>
      </div>
    );
  } else {
    return (
      <div style={styles.mainContainerHover}>
        <div style={styles.h2ContainerHover}>
          <h2 style={styles.h2}>Chat History</h2>
          <Button startIcon={<OpenInFull />} onClick={() => setDisplay(true)} />
        </div>
      </div>
    );
  }
};

export default ChatHistory;

// ChatHistory.js
import React, { useState } from 'react';
import { List, ListItem, ListItemText, Button } from '@mui/material';
import { styles } from './styles';
import { setChatSession, setSessionLoaded, resetChat } from '@/redux/slices/chatSlice';
import { useDispatch } from 'react-redux';
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
  const milliseconds = timestamp.seconds * 1000 + timestamp.nanoseconds / 1000000;
  const date = new Date(milliseconds);

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

const handleChatSessionClick = (id) => {
    dispatch(resetChat());
    // Handle chat session click
    dispatch(setChatSession(history.find((session) => session.id === id)));
}
  if (display) {
    return (
      <div style = {styles.mainContainer}>
        <List style={styles.sidebarContainer}>
          <div style = {styles.h2Container}>
            <h2 style={styles.h2}>Chat History</h2>
            {<Button startIcon={<Minimize />} onClick={() => setDisplay(false)}/>}
          </div>
          {history.map((entry) => (
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
                primary={truncateText(entry.messages[0]?.payload?.text || '', 15)}
                style={styles.chatSessionText}
              />
              <ListItemText
                primary={convertTimestampToDate(entry.createdAt)}
                style={styles.chatTimeText}
              />
            </ListItem>
          ))}
        </List>
      </div>
    );
  }
  else {
    return (
      <div style={styles.mainContainerHover}>
          <div style = {styles.h2ContainerHover}>
            <h2 style={styles.h2}>Chat History</h2>
            {<Button startIcon={<OpenInFull />} onClick={() => setDisplay(true)}/> }
          </div>
      </div>
    )
  }
};

export default ChatHistory;
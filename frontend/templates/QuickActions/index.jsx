// QuickActions.jsx

import React from 'react';
import { Button, ButtonGroup } from '@mui/material';
import { useDispatch } from 'react-redux';
import { setInput, setStreaming } from '@/redux/slices/chatSlice';
import styles from './styles';

const QuickActions = ({ onAction }) => {
  const dispatch = useDispatch();

  const handleQuickAction = (action) => {
    dispatch(setStreaming(true));
    onAction(action);
  };

  return (
    <ButtonGroup
      variant="contained"
      aria-label="quick action button group"
      sx={styles.buttonGroup}
    >
      <Button onClick={() => handleQuickAction('suggest_techniques')} sx={styles.button}>
        Suggest Learning Techniques
      </Button>
      <Button onClick={() => handleQuickAction('recommend_books')} sx={styles.button}>
        Recommend Books
      </Button>
      <Button onClick={() => handleQuickAction('summarize')} sx={styles.button}>
        Summarize
      </Button>
    </ButtonGroup>
  );
};

export default QuickActions;
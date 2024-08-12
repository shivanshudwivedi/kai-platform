// QuickActions.jsx

import React, { useState } from 'react';

import { Button, ButtonGroup } from '@mui/material';

import MyIcon from '@/assets/svg/toggle.svg';

import buttonStyles from './styles';

const QuickActions = () => {
  const [display, setDisplay] = useState(false);

  const handleClick = () => {
    setDisplay((prevDisplay) => !prevDisplay);
  };

  return (
    <div>
      <Button sx={buttonStyles} onClick={handleClick}>
        <MyIcon />
      </Button>

      {display && (
        <ButtonGroup
          variant="contained"
          aria-label="outlined primary button group"
        >
          <Button>Suggest Learning Techniques</Button>
          <Button>Recommend Books</Button>
          <Button>Summarize</Button>
        </ButtonGroup>
      )}
    </div>
  );
};

export default QuickActions;

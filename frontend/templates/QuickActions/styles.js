const buttonStyles = {
    position: 'absolute',
    bottom: '8%',
    left: '6%',
    zIndex: '9999',
  
    padding: '8px',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 'auto',
    height: 'auto',

    buttonGroup: {
      position: 'absolute',
      bottom: '8%',
      left: '6%',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-start',
    },
    button: {
      marginBottom: '8px',
      textTransform: 'none',
      borderRadius: '20px',
      padding: '8px 16px',
      backgroundColor: (theme) => theme.palette.primary.main,
      color: 'white',
      '&:hover': {
        backgroundColor: (theme) => theme.palette.primary.dark,
      },
    },
  };
  
  export default buttonStyles;
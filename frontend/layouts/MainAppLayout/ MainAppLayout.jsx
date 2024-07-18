import { useEffect } from 'react';
import { Grid, useMediaQuery } from '@mui/material';
import { useRouter } from 'next/router'; // Import useRouter
import { useDispatch, useSelector } from 'react-redux';
import { httpsCallable } from 'firebase/functions';
import AppDisabled from '@/components/AppDisabled';
import Loader from '@/components/Loader';
import ChatHistory from '@/templates/Chat/ChatHistory';
import SideMenu from './SideMenu';
import styles from './styles';
import { setLoading } from '@/redux/slices/authSlice';
import { setAllSessions } from '@/redux/slices/chatSlice';
import { functions } from '@/redux/store'; 
import Head from 'next/head';

/**
 * Renders the main application layout.
 *
 * @param {Object} props - The properties passed to the component.
 * @param {ReactNode} props.children - The child components to render.
 * @param {Object} props.extraContentProps - The additional properties for the extra content.
 * @param {boolean} props.isToolPage - Indicates if the layout is for a tool page.
 * @return {ReactNode} The rendered main application layout.
 */
const MainAppLayout = (props) => {
  const { children, extraContentProps, isToolPage } = props;
  const dispatch = useDispatch();
  const router = useRouter(); // Initialize useRouter

  const { allSessions } = useSelector((state) => state.chat);

  const auth = useSelector((state) => state.auth);
  const user = useSelector((state) => state.user);
  const { data: userData } = useSelector((state) => state.user);

  const isTabletScreen = useMediaQuery((theme) =>
    theme.breakpoints.down('laptop')
  );

  const isLoading = auth.loading || !user.data || !auth.data;

  useEffect(() => {
    if (!userData?.id) return;

    const fetchChatHistory = httpsCallable(functions, 'fetchChatHistory');

    fetchChatHistory({ userId: userData.id })
      .then((result) => {
        const { data } = result.data;
        dispatch(setAllSessions(data));
      })
      .catch((error) => {
        console.error('Error fetching user sessions:', error);
      });
  }, [dispatch, userData?.id]);

  useEffect(() => {
    dispatch(setLoading(false));
  }, []);

  if (isLoading) return <Loader />;

  const renderHead = () => {
    return (
      <Head>
        <title>Kai AI</title>
      </Head>
    );
  };

  const renderChatHistory = () => {
    return (
      <div>
        <ChatHistory history={allSessions} />
      </div>
    );
  };

  const renderApp = () => {
    return (
      <>
        <SideMenu />
        <Grid {...styles.contentGridProps(extraContentProps, isToolPage)}>
          {children}
        </Grid>
      </>
    );
  };

  return (
    <Grid {...styles.mainGridProps}>
      {renderHead()}
      {isTabletScreen && <AppDisabled head={renderHead()} />}
      {!isTabletScreen && (
        <>
          {renderApp()}
          {router.pathname === '/chat' && renderChatHistory()} {/* Conditionally render ChatHistory */}
        </>
      )}
    </Grid>
  );
};

export default MainAppLayout;

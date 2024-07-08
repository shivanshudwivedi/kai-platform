import { useEffect } from 'react';
import { Grid, useMediaQuery } from '@mui/material';
import Head from 'next/head';
import { useDispatch, useSelector } from 'react-redux';
import { useRouter } from 'next/router'; // Import useRouter

import AppDisabled from '@/components/AppDisabled';
import Loader from '@/components/Loader';
import SideMenu from './SideMenu';
import styles from './styles';

import { setLoading } from '@/redux/slices/authSlice';
import ChatHistory from '@/templates/Chat/ChatHistory';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { setAllSessions } from '@/redux/slices/chatSlice';
import { firestore } from '@/redux/store';
import { all } from 'axios';

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

  const { sessions, allSessions } = useSelector((state) => state.chat);

  const auth = useSelector((state) => state.auth);
  const user = useSelector((state) => state.user);
  const { data: userData } = useSelector((state) => state.user);

  const isTabletScreen = useMediaQuery((theme) =>
    theme.breakpoints.down('laptop')
  );

  const isLoading = auth.loading || !user.data || !auth.data;

  useEffect(() => {
    const fetchUserSessions = async () => {
      try {
        const sessionsRef = collection(firestore, 'chatSessions');
        const q = query(sessionsRef, where('user.id', '==', userData?.id));
        console.log(userData?.id)
        const sessionsSnapshot = await getDocs(q);
        const sessionsData = sessionsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

        dispatch(setAllSessions(sessionsData));
      } catch (error) {
        console.error('Error fetching user sessions:', error);
      }
    };

    if (userData?.id) {
      fetchUserSessions();
    }
  }, [dispatch, userData?.id, allSessions]);

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

import { ThemeProvider } from "@emotion/react";
import { useRouter } from "next/router";
import { GoogleAnalytics } from "nextjs-google-analytics";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";

import firebaseConfig from "@/firebase/config";
import GlobalProvider from "@/providers/GlobalProvider";
import store, { persistor } from "@/redux/store";
import theme from "@/theme/theme";

import "@/styles/globals.css";

const App = ({ Component, pageProps }) => {
  const getLayout = Component.getLayout || ((page) => page);
  const { query } = useRouter();

  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <ThemeProvider theme={theme}>
          <GlobalProvider>
            <GoogleAnalytics
              trackPageViews
              gaMeasurementId={firebaseConfig.measurementId}
            />
            {getLayout(<Component {...pageProps} />, query)}
          </GlobalProvider>
        </ThemeProvider>
      </PersistGate>
    </Provider>
  );
};

export default App;

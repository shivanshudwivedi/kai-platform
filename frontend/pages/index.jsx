import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import MainAppLayout from "@/layouts/MainAppLayout";
import HomePage from "@/templates/HomePage";
import { firestore } from "@/redux/store";
import fetchTools from "@/redux/thunks/tools";
import { fetchChatHistory } from "@/components/FetchChatHistory/function";
import { setChatHistory } from "@/redux/slices/chatSlice";

const Home = () => {
  const dispatch = useDispatch();
  const { data: tools, loading, error } = useSelector((state) => state.tools);
  const { data: userData } = useSelector((state) => state.user);

  useEffect(() => {
    const fetchData = async () => {
      if (!tools) {
        await dispatch(fetchTools({ firestore }));
      }

      if (userData?.id) {
        try {
          const history = await fetchChatHistory(userData.id);
          dispatch(setChatHistory(history));
        } catch (error) {
          console.error("Error fetching chat history:", error);
        }
      }
    };

    fetchData();
  }, [dispatch, tools, userData]);

  return <HomePage data={tools} loading={loading} error={error} />;
};

Home.getLayout = function getLayout(page) {
  return <MainAppLayout>{page}</MainAppLayout>;
};

export default Home;

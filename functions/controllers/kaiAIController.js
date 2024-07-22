const admin = require('firebase-admin');
const storage = admin.storage();
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { default: axios } = require('axios');
const { logger, https } = require('firebase-functions/v1');
const { Timestamp } = require('firebase-admin/firestore');
const { BOT_TYPE } = require('../constants');
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const busboy = require('busboy');
const app = express();
const { getAuth } = require('firebase-admin/auth');

const DEBUG = process.env.DEBUG;
/**
 * Simulates communication with a Kai AI endpoint.
 *
 * @param {object} payload - The properties of the communication.
 * @param {object} props.data - The payload data object used in the communication.
 *  @param {Array} props.data.messages - An array of messages for the current user chat session.
 *  @param {object} props.data.user - The user object.
 *    @param {string} props.data.user.id - The id of the current user.
 *    @param {string} props.data.user.fullName - The user's full name.
 *    @param {string} props.data.user.email - The users email.
 *  @param {object} props.data.tool_data - The payload data object used in the communication.
 *    @param {string} props.data.tool_data.tool_id - The payload data object used in the communication.
 *    @param {Array} props.data.tool_data.inputs - The different form input values sent for a tool.
 *  @param {string} props.data.type - The payload data object used in the communication.
 *
 * @return {object} The response from the AI service.
 */
const kaiCommunicator = async (payload) => {
  try {
    DEBUG && logger.log('kaiCommunicator started, data:', payload.data);

    const { messages, user, tool_data, type } = payload.data;

    const isToolCommunicator = type === BOT_TYPE.TOOL;
    const KAI_API_KEY = process.env.KAI_API_KEY;
    const KAI_ENDPOINT = process.env.KAI_ENDPOINT;

    DEBUG &&
      logger.log(
        'Communicator variables:',
        `API_KEY: ${KAI_API_KEY}`,
        `ENDPOINT: ${KAI_ENDPOINT}`
      );

    const headers = {
      'API-Key': KAI_API_KEY,
      'Content-Type': 'application/json',
    };

    const kaiPayload = {
      user,
      type,
      ...(isToolCommunicator ? { tool_data } : { messages }),
    };

    DEBUG && logger.log('KAI_ENDPOINT', KAI_ENDPOINT);
    DEBUG && logger.log('kaiPayload', kaiPayload);

    const resp = await axios.post(KAI_ENDPOINT, kaiPayload, {
      headers,
    });

    DEBUG && logger.log('kaiCommunicator response:', resp.data);

    return { status: 'success', data: resp.data };
  } catch (error) {
    const {
      response: { data },
    } = error;
    const { message } = data;
    DEBUG && logger.error('kaiCommunicator error:', data);
    throw new HttpsError('internal', message);
  }
};

/**
 * Manages communications for a specific chat session with a chatbot, updating and retrieving messages.
 *
 * @param {object} props - The properties of the communication.
 * @param {object} props.data - The data object containing the message and id.
 * @param {string} props.data.id - The id of the chat session.
 * @param {string} props.data.message - The message object.
 *
 * @return {object} The response object containing the status and data.
 */
const chat = onCall(async (props) => {
  try {
    DEBUG && logger.log('Communicator started, data:', props.data);

    const { message, id } = props.data;

    DEBUG &&
      logger.log(
        'Communicator variables:',
        `API_KEY: ${process.env.KAI_API_KEY}`,
        `ENDPOINT: ${process.env.KAI_ENDPOINT}`
      );

    const chatSession = await admin
      .firestore()
      .collection('chatSessions')
      .doc(id)
      .get();

    if (!chatSession.exists) {
      logger.log('Chat session not found: ', id);
      throw new HttpsError('not-found', 'Chat session not found');
    }

    const { user, type, messages } = chatSession.data();

    let truncatedMessages = messages;

    // Check if messages length exceeds 50, if so, truncate
    if (messages.length > 100) {
      truncatedMessages = messages.slice(messages.length - 65);
    }

    // Update message structure here
    const updatedMessages = truncatedMessages.concat([
      {
        ...message,
        timestamp: Timestamp.fromMillis(Date.now()), // ISO 8601 format string
      },
    ]);

    await chatSession.ref.update({ messages: updatedMessages });

    // Construct payload for the kaiCommunicator
    const KaiPayload = {
      messages: updatedMessages,
      type,
      user,
    };

    const response = await kaiCommunicator({
      data: KaiPayload,
    });

    DEBUG && logger.log('kaiCommunicator response:', response.data);

    // Process response and update Firestore
    const updatedResponseMessages = updatedMessages.concat(
      response.data?.data?.map((msg) => ({
        ...msg,
        timestamp: Timestamp.fromMillis(Date.now()), // ensure consistent timestamp format
      }))
    );

    await chatSession.ref.update({ messages: updatedResponseMessages });

    if (DEBUG) {
      logger.log(
        'Updated chat session: ',
        (await chatSession.ref.get()).data()
      );
    }

    return { status: 'success' };
  } catch (error) {
    DEBUG && logger.log('Communicator error:', error);
    throw new HttpsError('internal', error.message);
  }
});

/**
 * Handles tool communications by processing input data and optional file uploads.
 * It supports both JSON and form-data requests to accommodate different client implementations.
 *
 * @param {Request} req - The Express request object, which includes form data and files.
 * @param {Response} res - The Express response object used to send back the HTTP response.
 * @return {void} Sends a response to the client based on the processing results.
 * @throws {HttpsError} Throws an error if processing fails or data is invalid.
 */
app.post('/api/tool/', (req, res) => {
  const bb = busboy({ headers: req.headers });

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const uploads = [];
  const data = [];

  bb.on('file', (fieldname, file, info) => {
    const { filename } = info;
    const fileId = uuidv4();
    const filePath = `uploads/${fileId}-${filename}`;
    const { name: bucketName } = storage.bucket();

    const fileWriteStream = storage
      .bucket(bucketName)
      .file(filePath)
      .createWriteStream();

    file.pipe(fileWriteStream);

    const uploadPromise = new Promise((resolve, reject) => {
      fileWriteStream.on('finish', async () => {
        // Make the file publicly readable
        await storage.bucket(bucketName).file(filePath).makePublic();

        // Construct the direct public URL
        const publicUrl = `https://storage.googleapis.com/${bucketName}/${filePath}`;

        DEBUG &&
          console.log(
            `File ${filename} uploaded and available at ${publicUrl}`
          );

        resolve({ filePath, url: publicUrl, filename });
      });

      fileWriteStream.on('error', reject);
    });

    uploads.push(uploadPromise);
  });

  bb.on('field', (name, value) => {
    data[name] = value;
  });

  bb.on('finish', async () => {
    try {
      DEBUG && logger.log('data:', JSON.parse(data?.data));

      const {
        tool_data: { inputs, ...otherToolData },
        ...otherData
      } = JSON.parse(data?.data);

      const results = await Promise.all(uploads);

      res.set('Access-Control-Allow-Origin', '*'); // @todo: set the correct origin for security!
      res.set('Access-Control-Allow-Methods', 'POST');
      res.set('Access-Control-Allow-Headers', 'Content-Type');

      const modifiedInputs =
        uploads?.length > 0
          ? [...inputs, { name: 'files', value: results }]
          : inputs;

      const response = await kaiCommunicator({
        data: {
          ...otherData,
          tool_data: {
            ...otherToolData,
            inputs: modifiedInputs,
          },
        },
      });
      DEBUG && logger.log(response);

      res.status(200).json({ success: true, data: response.data });
    } catch (error) {
      logger.error('Error processing request:', error);
      res.status(500).json({ success: false, message: error?.message });
    }
  });

  bb.end(req.rawBody);
});

/**
 * Creates a new chat session for an authenticated user.
 * If the chat session creation is successful, it sends the first message to the AI and stores the response.
 *
 * @param {Object} request - The request object containing the data and auth information.
 * @param {Object} request.data - The data object containing the user, message, and type information.
 * @param {Object} request.data.user - The user object.
 * @param {Object} request.data.message - The initial message object.
 * @param {string} request.data.type - The bot type.
 *
 * @return {Promise<Object>} - A promise that resolves to an object containing the status and data of the chat session.
 * @throws {HttpsError} Throws an error if the user is not authenticated, if required fields are missing, or if there is an internal error.
 */
const createChatSession = onCall(async (request) => {
  logger.info('createChatSession function called', { structuredData: true });

  try {
    // Check if the user is authenticated
    if (!request.auth) {
      logger.error('Unauthenticated access attempt');
      throw new HttpsError('unauthenticated', 'User must be authenticated to create a chat session');
    }

    const { user, message, type } = request.data;

    // Validate input
    if (!user || !message || !type) {
      logger.error('Missing required fields', request.data);
      throw new HttpsError('invalid-argument', 'Missing required fields');
    }

    if (typeof message.content !== 'string' || message.content.trim().length === 0) {
      logger.error('Invalid message format', message);
      throw new HttpsError('invalid-argument', 'Invalid message format');
    }

    if (!Object.values(BOT_TYPE).includes(type)) {
      logger.error('Invalid bot type', type);
      throw new HttpsError('invalid-argument', 'Invalid bot type');
    }

    // Ensure the user ID in the request matches the authenticated user's ID
    if (user.id !== request.auth.uid) {
      logger.error('User ID mismatch', { providedId: user.id, authId: request.auth.uid });
      throw new HttpsError('permission-denied', 'User ID does not match authenticated user');
    }

    const initialMessage = {
      ...message,
      timestamp: Timestamp.fromMillis(Date.now()),
    };

    // Create new chat session
    const chatSessionRef = await admin
      .firestore()
      .collection('chatSessions')
      .add({
        messages: [initialMessage],
        user,
        type,
        createdAt: Timestamp.fromMillis(Date.now()),
        updatedAt: Timestamp.fromMillis(Date.now()),
      });

    logger.info(`Created new chat session with ID: ${chatSessionRef.id}`);

    // Send initial message to Kai AI
    const response = await kaiCommunicator({
      data: {
        messages: [initialMessage],
        user,
        type,
      },
    });

    logger.info('Received response from Kai AI');

    const { messages } = (await chatSessionRef.get()).data();

    // Add AI response to chat session
    const updatedResponseMessages = messages.concat(
      Array.isArray(response.data?.data)
        ? response.data?.data?.map((message) => ({
            ...message,
            timestamp: Timestamp.fromMillis(Date.now()),
          }))
        : [
            {
              ...response.data?.data,
              timestamp: Timestamp.fromMillis(Date.now()),
            },
          ]
    );

    await chatSessionRef.update({
      messages: updatedResponseMessages,
      id: chatSessionRef.id,
      updatedAt: Timestamp.fromMillis(Date.now()),
    });

    const updatedChatSession = await chatSessionRef.get();
    const createdChatSession = {
      ...updatedChatSession.data(),
      id: updatedChatSession.id,
    };

    logger.info('Successfully created and updated chat session');
    return {
      status: 'created',
      data: createdChatSession,
    };
  } catch (error) {
    logger.error('Error in createChatSession:', error);

    if (error instanceof HttpsError) {
      throw error;
    }

    throw new HttpsError('internal', 'An unexpected error occurred while creating the chat session');
  }
});


/**
 * Fetches the chat history for a specific user from Firestore.
 *
 * This function retrieves chat documents for the authenticated user from the 'chatSessions' collection in Firestore.
 * It handles potential index issues and falls back to an unordered query if necessary.
 *
 * @function fetchChatHistory
 * @param {object} request - The request object containing the data and auth information.
 * @throws {HttpsError} If the user is not authenticated or if there is an internal error during Firestore query execution.
 * 
 * @returns {object} An object containing the status of the request and the chat history data.
 * @returns {string} returns.status - The status of the request ('success' if successful).
 * @returns {Array} returns.data - An array of chat history objects, each containing an id and chat data.
 */
const fetchChatHistory = onCall(async (request) => {
  logger.info('fetchChatHistory function called', { structuredData: true });

  try {
    // Check if the user is authenticated
    if (!request.auth) {
      logger.error('Unauthenticated access attempt');
      throw new HttpsError('unauthenticated', 'User must be authenticated to fetch chat history');
    }

    const userId = request.auth.uid;
    logger.info(`Fetching chat history for user: ${userId}`);

    let chatHistoryQuery = admin
      .firestore()
      .collection('chatSessions')
      .where('user.id', '==', userId)
      .orderBy('updatedAt', 'desc');

    let chatHistorySnapshot;
    try {
      chatHistorySnapshot = await chatHistoryQuery.get();
    } catch (queryError) {
      if (queryError.code === 9) { // FAILED_PRECONDITION, likely due to missing index
        logger.warn('Index not found, falling back to unordered query');
        // Fallback to a simpler query without ordering
        chatHistoryQuery = admin
          .firestore()
          .collection('chatSessions')
          .where('user.id', '==', userId);
        chatHistorySnapshot = await chatHistoryQuery.get();
      } else {
        logger.error('Error executing Firestore query:', queryError);
        throw queryError; // Re-throw if it's not an index issue
      }
    }

    logger.info(`Found ${chatHistorySnapshot.size} chat sessions for userId: ${userId}`);

    if (chatHistorySnapshot.empty) {
      logger.info('No chat history found for the user');
      return { status: 'success', data: [] };
    }

    const chatHistory = chatHistorySnapshot.docs.map(doc => {
      const data = doc.data();
      const lastMessage = data.messages && data.messages.length > 0 
        ? data.messages[data.messages.length - 1] 
        : null;
      
      return {
        id: doc.id,
        lastMessage: lastMessage ? lastMessage.content : 'No messages',
        timestamp: data.updatedAt ? data.updatedAt.toDate().toISOString() : null,
        user: data.user || {},
        messageCount: data.messages ? data.messages.length : 0,
        type: data.type || 'chat'
      };
    });

    logger.info('Successfully fetched and processed chat history');
    return { status: 'success', data: chatHistory };

  } catch (error) {
    logger.error('Error in fetchChatHistory:', error);

    if (error instanceof HttpsError) {
      throw error;
    }

    throw new HttpsError('internal', 'An unexpected error occurred while fetching chat history');
  }
});

/**
 * Reopens a chat session by fetching its data from Firestore.
 *
 * @param {Object} request - The request object containing the data and auth information.
 * @param {Object} request.data - The data object containing the chatId.
 * @param {string} request.data.chatId - The ID of the chat session to reopen.
 *
 * @returns {Object} - An object containing the status and chat session data.
 *
 * @throws {HttpsError} - Throws an error if user is not authenticated, chatId is missing, if the chat session is not found, or if an internal error occurs.
 */
const reopenChatSession = onCall(async (request) => {
  logger.info('reopenChatSession function called', { structuredData: true });

  try {
    // Check if the user is authenticated
    if (!request.auth) {
      logger.error('Unauthenticated access attempt');
      throw new HttpsError('unauthenticated', 'User must be authenticated to reopen a chat session');
    }

    const userId = request.auth.uid;
    const chatId = request.data?.chatId;
    logger.info(`Attempting to reopen chat session ${chatId} for user ${userId}`);

    if (!chatId) {
      logger.error('Missing chatId in request');
      throw new HttpsError('invalid-argument', 'Missing chatId');
    }

    const chatSessionRef = admin.firestore().collection('chatSessions').doc(chatId);
    const chatSession = await chatSessionRef.get();

    if (!chatSession.exists) {
      logger.error(`Chat session not found: ${chatId}`);
      throw new HttpsError('not-found', 'Chat session not found');
    }

    const chatData = chatSession.data();

    // Check if the chat session belongs to the authenticated user
    if (chatData.user.id !== userId) {
      logger.error(`User ${userId} attempted to access chat session ${chatId} belonging to user ${chatData.user.id}`);
      throw new HttpsError('permission-denied', 'You do not have permission to access this chat session');
    }

    logger.info(`Successfully reopened chat session: ${chatId}`);

    return { 
      status: 'success', 
      data: {
        id: chatSession.id,
        ...chatData,
        messages: chatData.messages.map(msg => ({
          ...msg,
          timestamp: msg.timestamp.toDate().toISOString()
        }))
      }
    };
  } catch (error) {
    logger.error('Error reopening chat session:', error);

    if (error instanceof HttpsError) {
      throw error;
    }

    throw new HttpsError('internal', 'An unexpected error occurred while reopening the chat session');
  }
});


module.exports = {
  chat,
  tool: https.onRequest(app),
  createChatSession,
  fetchChatHistory,
  reopenChatSession,
};

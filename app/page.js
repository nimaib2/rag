'use client'

import { useState } from "react";
import { Box, Button, Stack, TextField } from '@mui/material';

export default function Home() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Hi! I'm the Rate My Professor support assistant. How can I help you today?"
    }
  ]);
  const [message, setMessage] = useState('');

  const sendMessage = async () => {
    if (message.trim()) {
      // Add the user's message and an empty placeholder for the assistant's response
      setMessages((prevMessages) => [
        ...prevMessages,
        { role: "user", content: message },
        { role: "assistant", content: '' }  // Placeholder for the assistant's full response
      ]);
      
      setMessage('');
  
      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify([...messages, { role: "user", content: message }])
        });
  
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullMessage = '';
  
        const processText = async ({ done, value }) => {
          if (done) {
            // Update the last message with the full response text
            const text = decoder.decode(value || new Uint8Array(), { stream: true });
            fullMessage += text;  // Accumulate the text
            setMessages((prevMessages) => {
              const updatedMessages = [...prevMessages];
              updatedMessages[updatedMessages.length - 1].content = fullMessage;
              return updatedMessages;
            });
            return;
          }
  
          
  
          // Continue reading the next chunk
          reader.read().then(processText);
        };
  
        reader.read().then(processText);
  
      } catch (error) {
        console.error('Error:', error);
        // Optionally handle the error by updating the UI or adding an error message
      }
    }
  };
  

  return (
    <Box
      width="100vw"
      height="100vh"
      display="flex"
      flexDirection="column"
      justifyContent="center"
      alignItems="center"
    >
      <Stack direction="column" width="500px" height="700px" border="1px solid black" p={2} spacing={3}>
        <Stack
          direction="column"
          spacing={2}
          flexGrow={1}
          overflow='auto'
          maxHeight='100%'
        >
          {messages.map((message, index) => (
            <Box key={index} display='flex' justifyContent={message.role === "assistant" ? "flex-start" : "flex-end"}>
              <Box
                bgcolor={message.role === "assistant" ? "primary.main" : "secondary.main"}
                color="white"
                borderRadius={16}
                p={3}
              >
                {message.content}
              </Box>
            </Box>
          ))}
        </Stack>
        <Stack direction="row" spacing={2}>
          <TextField
            label="Message"
            fullWidth
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          <Button variant='contained' onClick={sendMessage}>
            Send
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
}

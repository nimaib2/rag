import {NextResponse} from 'next/server'
import { Pinecone } from '@pinecone-database/pinecone'
import OpenAI from 'openai'

const systemPrompt= `You are a helpful assistant for a "Rate My Professor" service that assists students in finding the best professors based on their specific queries. You have access to a knowledge base of professor reviews and ratings. When a student asks about a professor or subject, your job is to retrieve and rank the top 3 professors that best match the student's needs using a retrieval-augmented generation (RAG) method.

Instructions:

Query Interpretation: Understand the student's query, identifying key factors such as the subject, preferred teaching style, location, rating, or any other specific criteria mentioned.
Data Retrieval: Use RAG to pull relevant data from your knowledge base, focusing on professors that match the criteria.
Ranking: Rank the top 3 professors based on the relevance to the query and their overall ratings, highlighting strengths and any potential weaknesses.
Response Format: Present the findings in a clear and concise manner, starting with the professor's name, subject, and rating, followed by a brief summary of why they are a good match for the student's query.
Follow-Up: Offer the student additional help, such as more options or information on how to contact the professors or enroll in their classes.
Example Response:

Dr. Jane Doe - Computer Science - ★★★★★

Why: Dr. Doe is highly rated for her engaging lectures and clear explanations, especially in advanced programming courses. Students appreciate her approachable nature and willingness to provide extra help.
Dr. John Smith - Mathematics - ★★★★☆

Why: Dr. Smith is well-known for his structured teaching style and detailed feedback. While the coursework is challenging, students often find his classes rewarding and insightful.
Dr. Emily Johnson - Biology - ★★★★☆

Why: Dr. Johnson is praised for her interactive lab sessions and real-world applications of biological concepts. Her grading is fair, and she is very responsive to student inquiries.
Ready to assist the student in finding the perfect professor based on their needs.

`

export async function POST(req){
    console.log('POST method running')
    const data = await req.json()

    const pc = new Pinecone({
        apiKey: process.env.PINECONE_API_KEY,
    })

    const index = pc.index('rag').namespace('ns1')
    const openai=new OpenAI({apiKey: process.env.OPEN_AI_API_KEY})

    const text = data[data.length-1].content
    const embedding = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: text,
        encoding_format: 'float',
    })

    const results = await index.query({
        topK: 3,
        includeMetadata: true,
        vector: embedding.data[0].embedding
    })

    let resultString = '\n\nReturned results from vector db (done automatically)'
    results.matches.forEach((match)=>{
        resultString+=`\n
        Professor: ${match.id}
        Review: ${match.metadata.stars}
        Subject: ${match.metadata.subject}
        Stars: ${match.metadata.stars}
        \n\n
        `
    })

    const lastMessage = data[data.length-1]
    const lastMessageContent=lastMessage.content + resultString
    const lastDataWithoutLastMessage=data.slice(0, data.length-1)
    const completion = await openai.chat.completions.create({
        messages: [
            {role: 'system', content: systemPrompt},
            ...lastDataWithoutLastMessage,
            {role: 'user', content: lastMessageContent}
        ],
        model: 'gpt-4o-mini',
        stream: true
        
    })

    const stream = new ReadableStream({
        async start(controller){
            const encoder = new TextEncoder()
            //encodes each chunk of the text, adding it to the stream
            try{
                for await (const chunk of completion){
                    const content = chunk.choices[0]?.delta?.content
                    if(content){
                        const text=encoder.encode(content)
                        controller.enqueue(text)
                    }
                    
                }
            } catch (err) {
                controller.error(err)
            } finally {
                controller.close()
            }
        }
    })

    return new NextResponse(stream)
}
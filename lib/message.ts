export type Message = {
  role: "user" | "assistant";
  content: string | (pdfMessage | textMessage)[] | (pdfMessage | uploadMessage | textMessage)[];
}

interface pdfMessage {
    type: "document",
    source: {
        type: "base64",
        media_type: "application/pdf",
        data: string,
    },
}

export function createPDFMessage (data: string) : pdfMessage[] {
    return  [{
        type: "document",
        source: {
            type: "base64",
            media_type: "application/pdf",
            data: data
        }
    }];
}

interface textMessage {
    type: "text",
    text: string,
}

export function createTextMessage (text: string) : textMessage[] {
    return [
        {
            type: "text",
            text: text,
        }
    ]
}

interface uploadMessage {
    type: "container_upload",
    file_id: string,
}    

export function createUploadMessage(file_id: string) : uploadMessage[] {
    return [
        {
            type: "container_upload",
            file_id: file_id,
        }    
    ]
} 
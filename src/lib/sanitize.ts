import DOMPurify from 'dompurify';

export const sanitizeHtml = (html: string): string => {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'br', 'b', 'strong', 'i', 'em', 'u', 'ul', 'ol', 'li', 'span'],
    ALLOWED_ATTR: ['class'],
  });
};

export const sanitizeAndFormatForWord = (content: string, title: string): string => {
  const sanitizedContent = sanitizeHtml(content);
  const sanitizedTitle = DOMPurify.sanitize(title);

  return `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" 
          xmlns:w="urn:schemas-microsoft-com:office:word" 
          xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="utf-8">
      <title>${sanitizedTitle}</title>
    </head>
    <body>
      <h1>${sanitizedTitle}</h1>
      ${sanitizedContent}
    </body>
    </html>
  `;
};
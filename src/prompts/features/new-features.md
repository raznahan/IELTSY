# IELTS Chatbot Features Specification

## Context
Analyse the current codebase before implementing any new features. so the new feature would follow the current architecture of the codebase.
and would not break any existing functionality.

## 1. Score Over Time
**Feature**: Implement a line graph to display the user's IELTS scores over time.
**User Story**: "As a user, I want to see a visual representation of my IELTS test scores over time so that I can understand my learning progress and identify performance trends."

## 2. Task-Specific Scores: TR, CC, LR, GRA.
**Feature**: Create bar charts or pie charts to show scores for specific tasks like Task Response (TR), Coherence and Cohesion (CC), and Grammatical Range (GRA), and Lexical Resource (LR).
**User Story**: "As a user, I want to see my scores broken down by specific criteria to identify areas needing improvement and effectively focus my study efforts."

## 3. Celebrate Milestones
**Feature**: Design a system where the bot congratulates users upon reaching significant milestones like achieving target scores or completing a number of practice tests.
**User Story**: "As a user, I want to receive acknowledgments for my accomplishments to stay motivated throughout my learning journey. I want to be able to set target scores and be notified when I achieve them. For instance, if I set a target of 7.5 for my overall band score, I want to be congratulated when I achieve it."

## 4. Heatmaps
**Feature**: Generate heatmaps to indicate frequently incorrect or challenging areas in practice tests(refer to error codes and categories down below).
**User Story**: "As a user, I want to visualize parts of the test where I frequently make mistakes, so I can allocate more study time to these areas."

## 5. Error Categories
**Feature**: Develop analytics to categorize common mistakes in user essays based on the IELTS rubric.
**User Story**: "As a user, I want to understand the types of errors I frequently make (e.g., grammatical, coherence,spelling etc) to focus my revisions on these specific issues. For instance, if I frequently make mistakes in the TR task, I want to know that so I can focus on improving my TR skills. or if I frequently make mistakes in the splelling, I want to know that so I can focus on improving that. Break down splelling issues or other stuff as sub-categories of the main categories." 
Follow the categories and sub-categories as mentioned below:
Task Response (TR) Errors
TR1: Failure to address all parts of the prompt
TR2: Insufficient detail or explanation
TR3: Irrelevant information
TR4: Inappropriate tone or formality
TR5: Inadequate conclusion
Coherence and Cohesion (CC) Errors
CC1: Lack of logical progression
CC2: Poor paragraphing
CC3: Overuse or underuse of linking words
CC4: Incorrect use of cohesive devices
CC5: Repetitive sentence structures
Grammatical Range and Accuracy (GRA) Errors
GRA1: Spelling errors
GRA2: Incorrect verb tenses
GRA3: Subject-verb agreement errors
GRA4: Sentence fragments or run-on sentences
GRA5: Incorrect use of articles
GRA6: Incorrect word order
Lexical Resource (LR) Errors
LR1: Limited vocabulary
LR2: Incorrect word choice
LR3: Word form errors
LR4: Inappropriate use of idiomatic expressions
LR5: Collocation errors

Store user errors in "essayModel.ts" with this format:
errors: {
    TR: [String],   // List of error codes like 'TR1', 'TR3'
    CC: [String], // List of error codes like 'CC2', 'CC3'
    LR: [String],  // List of error codes like 'LR1', 'LR2'
    GRA: [String], // List of error codes like 'GRA1', 'GRA3'
  }
One example error:
 "errors": {
    "taskResponse": ["TR1", "TR2"],
    "coherenceCohesion": ["CC2", "CC5"],
    "lexicalResource": ["LR1", "LR3"],
    "grammaticalRangeAccuracy": ["GRA1", "GRA2", "GRA5"]
  }


## 6. Ability to Share User Writing Feedback with Friends in Telegram
**Feature**: Allow users to easily share their writing feedback or progress reports with friends or study groups within Telegram.
**User Story**: "As a user, I want to share my writing feedback with friends for peer review or to celebrate my progress, fostering a collaborative and supportive learning environment."

## Implementation Tips
- **Charts and Visuals**: Utilize chart libraries compatible with Telegram APIs or consider third-party integrations to display the various statistics and analytics.
- **Error Analysis**: Assume that the data received from openai has error categories in it
- **Heatmaps**: Use the error codes to generate heatmaps for the user's essays.
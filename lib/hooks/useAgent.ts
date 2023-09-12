import { useState, useEffect } from "react";
import { usePolyfact } from "../hooks";

export const examples: string[] = [
    "Question --> What is the elevation range for the area that the eastern sector of the Colorado orogeny extends into? ==> Thought --> I need to search Colorado orogeny, find the area that the eastern sector of the Colorado orogeny extends into, then find the elevation range of the area. ==> Action --> Search[[Colorado orogeny]] ==> Observation --> The Colorado orogeny was an episode of mountain building (an orogeny) in Colorado and surrounding areas. ==> Thought --> It does not mention the eastern sector. So I need to look up eastern sector. ==> Action --> Lookup[eastern sector] ==> Observation --> (Result 1 / 1) The eastern sector extends into the High Plains and is called the Central Plains orogeny. ==> Thought --> The eastern sector of Colorado orogeny extends into the High Plains. So I need to search High Plains and find its elevation range. ==> Action --> Search[[High Plains]] ==> Observation --> High Plains refers to one of two distinct land regions ==> Thought --> I need to instead search High Plains (United States). ==> Action --> Search[[High Plains (United States)]] ==> Observation --> The High Plains are a subregion of the Great Plains. From east to west, the High Plains rise in elevation from around 1,800 to 7,000 ft (550 to 2,130 m).[3] ==> Thought --> High Plains rise in elevation from around 1,800 to 7,000 ft, so the answer is 1,800 to 7,000 ft. ==> Action --> Finish[[1,800 to 7,000 ft]]",
    'Question --> Musician and satirist Allie Goertz wrote a song about the "The Simpsons" character Milhouse, who Matt Groening named after who? ==> Thought --> The question simplifies to "The Simpsons" character Milhouse is named after who. I only need to search Milhouse and find who it is named after. ==> Action --> Search[[Milhouse]] ==> Observation --> Milhouse Mussolini Van Houten is a recurring character in the Fox animated television series The Simpsons voiced by Pamela Hayden and created by Matt Groening. ==> Thought --> The paragraph does not tell who Milhouse is named after, maybe I can look up "named after". ==> Action --> Lookup[named after] ==> Observation --> (Result 1 / 1) Milhouse was named after U.S. president Richard Nixon, whose middle name was Milhous. ==> Thought --> Milhouse was named after U.S. president Richard Nixon, so the answer is Richard Nixon. ==> Action --> Finish[[Richard Nixon]]',
    "Question --> Which documentary is about Finnish rock groups, Adam Clayton Powell or The Saimaa Gesture? ==> Thought --> I need to search Adam Clayton Powell and The Saimaa Gesture, and find which documentary is about Finnish rock groups. ==> Action --> Search[[Adam Clayton Powell]] ==> Observation --> Could not find [Adam Clayton Powell]. Similar --> [’Adam Clayton Powell III’, ’Seventh Avenue (Manhattan)’, ’Adam Clayton Powell Jr. State Office Building’, ’Isabel Washington Powell’, ’Adam Powell’, ’Adam Clayton Powell (film)’, ’Giancarlo Esposito’]. ==> Thought --> To find the documentary, I can search Adam Clayton Powell (film). ==> Action --> Search[[Adam Clayton Powell (film)]] ==> Observation --> Adam Clayton Powell is a 1989 American documentary film directed by Richard Kilberg. The film is about the rise and fall of influential African-American politician Adam Clayton Powell Jr.[3][4] It was later aired as part of the PBS series The American Experience. ==> Thought --> Adam Clayton Powell (film) is a documentary about an African-American politician, not Finnish rock groups. So the documentary about Finnish rock groups must instead be The Saimaa Gesture. ==> Action --> Finish[[The Saimaa Gesture]]",
    "Question --> What profession does Nicholas Ray and Elia Kazan have in common? ==> Thought --> I need to search Nicholas Ray and Elia Kazan, find their professions, then find the profession they have in common. ==> Action --> Search[[Nicholas Ray]] ==> Observation --> Nicholas Ray (born Raymond Nicholas Kienzle Jr., August 7, 1911 - June 16, 1979) was an American film director, screenwriter, and actor best known for the 1955 film Rebel Without a Cause. ==> Thought --> Professions of Nicholas Ray are director, screenwriter, and actor. I need to search Elia Kazan next and find his professions. ==> Action --> Search[[Elia Kazan]] ==> Observation --> Elia Kazan was an American film and theatre director, producer, screenwriter and actor. ==> Thought --> Professions of Elia Kazan are director, producer, screenwriter, and actor. So profession Nicholas Ray and Elia Kazan have in common is director, screenwriter, and actor. ==> Action --> Finish[[director, screenwriter, actor]]",
    "Question --> Which magazine was started first Arthur’s Magazine or First for Women? ==> Thought --> I need to search Arthur’s Magazine and First for Women, and find which was started first. ==> Action --> Search[[Arthur’s Magazine]] ==> Observation --> Arthur’s Magazine (1844-1846) was an American literary periodical published in Philadelphia in the 19th century. ==> Thought --> Arthur’s Magazine was started in 1844. I need to search First for Women next. ==> Action --> Search[[First for Women]] ==> Observation --> First for Women is a woman’s magazine published by Bauer Media Group in the USA.[1] The magazine was started in 1989. ==> Thought --> First for Women was started in 1989. 1844 (Arthur’s Magazine) < 1989 (First for Women), so Arthur’s Magazine was started first. ==> Action --> Finish[[Arthur’s Magazine]]",
    "Question --> Were Pavel Urysohn and Leonid Levin known for the same type of work? ==> Thought --> I need to search Pavel Urysohn and Leonid Levin, find their types of work, then find if they are the same. ==> Action --> Search[[Pavel Urysohn]] ==> Observation --> Pavel Samuilovich Urysohn (February 3, 1898 - August 17, 1924) was a Soviet mathematician who is best known for his contributions in dimension theory. ==> Thought --> Pavel Urysohn is a mathematician. I need to search Leonid Levin next and find its type of work. ==> Action --> Search[[Leonid Levin]] ==> Action --> Search[[Leonid Levin]] ==> Observation --> Leonid Anatolievich Levin is a Soviet-American mathematician and computer scientist. ==> Thought --> Leonid Levin is a mathematician and computer scientist. So Pavel Urysohn and Leonid Levin have the same type of work. ==> Action --> Finish[[yes]]",
];

type Line = {
    type: "Question" | "Thought" | "Action" | "Observation";
    arg: string;
};

type Action = {
    type: "Search" | "Finish";
    arg: string;
};

export type Options = {
    provider?: "openai" | "cohere" | "llama" | "";
    model?: string;
    stop?: string[];
    temperature?: number;
    infos?: boolean;
};

type Agent = {
    start?: (
        question: string,
        progress?: (step: string, result: string) => void,
    ) => Promise<string | null>;
    stop?: () => void;
    error?: string;
    loading?: boolean;
};

const useAgent = (options: Options = { provider: "openai", model: "gpt-3.5-turbo" }): Agent => {
    const { polyfact } = usePolyfact(null);

    const [isRunning, setIsRunning] = useState(true);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (polyfact) {
            setLoading(false);
        }
    }, [polyfact]);

    const parseLine = (line: string): Line => {
        const [type, arg] = line.split(/ {0,}--> {0,}/g);

        if (!["Question", "Thought", "Action", "Observation"].includes(type)) {
            throw new Error(`Unknown line type: ${type}, arg:  ${arg}`);
        }

        return {
            type: type as Line["type"],
            arg,
        };
    };

    const stop = () => {
        console.info("Stopping...");
        setIsRunning(false);
    };

    const search = async (query: string) => {
        const page = (await polyfact?.generate(query, {
            ...options,
            web: true,
        })) as string;

        return page;
    };

    const parseAction = (action: string): Action => {
        console.info("Parsing action...");

        const [type, arg] = action.split("[[");

        if (!["Search", "Finish"].includes(type)) {
            throw new Error("Unknown action type");
        }

        return {
            type: type as Action["type"],
            arg: arg.split("]]")[0],
        };
    };

    const executeAction = async (action: Action): Promise<string> => {
        console.info("Executing action...");

        if (action.type === "Search") {
            console.info(`Searching for ${action.arg}`);
            return (await search(action.arg as string)) as string;
        } else {
            return "Unknown action. Possible actions are Search[[]] and Finish[[]].";
        }
    };

    const start = async (
        question: string,
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        progress: (step: string, result: string) => void = () => {},
    ): Promise<string | null> => {
        console.info("Starting...");
        let history = `Examples : ${examples.join("\n\n")}
    
    Follow exactly the structure of the examples.
    It's important to use the same patterns like --> or ==>.
    Give alway a lot of details.
    Question --> ${question}`;

        let loop = 0;

        // eslint-disable-next-line no-constant-condition
        while (true) {
            const result = (await polyfact?.generate(history, {
                ...options,
                stop: ["==> Observation -->"],
            })) as string;

            progress(
                "process",
                result.replace(/ {0,}==> {0,}/g, "\n").replace(/ {0,}--> {0,}/g, ":"),
            );

            history += `\n${result}`;

            const lastLine = parseLine(result.split(/ {0,}==> {0,}/g).slice(-1)[0]);

            if (lastLine.type !== "Action") {
                throw new Error("Expected action");
            }

            const action = parseAction(lastLine.arg);

            if (action.type === "Finish" || loop === 4 || !isRunning) {
                progress("finish", action.arg);
                stop();
                return action.arg;
            }

            const actionResult = await executeAction(action);

            progress("observation", actionResult);

            history += `\nObservation --> ${actionResult}`;
            loop++;
        }
    };
    if (polyfact) {
        return { start, stop };
    }
    return { loading };
};

export default useAgent;
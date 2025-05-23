declare namespace NodeJS {
  export interface ProcessEnv {
    POSTGRES_HOST: string;
    POSTGRES_USER: string;
    POSTGRES_PASSWORD: string;
    POSTGRES_DB: string;
    DATABASE_URL: string;

    CONTAINER_TYPE: "PRIMARY" | "SECONDARY";
    
    PK: string;
    ALCHEMY_API_KEY: string;

    CLOB_API_KEY: string;
    CLOB_SECRET: string;
    CLOB_PASS_PHRASE: string;

    POLYMARKET_FUNDER_ADDRESS: string;
  }
}

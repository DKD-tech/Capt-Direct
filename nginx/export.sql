--
-- PostgreSQL database dump
--

-- Dumped from database version 17.0
-- Dumped by pg_dump version 17.0

-- Started on 2024-11-24 09:03:35

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 4 (class 2615 OID 2200)
-- Name: public; Type: SCHEMA; Schema: -; Owner: pg_database_owner
--

CREATE SCHEMA public;


ALTER SCHEMA public OWNER TO pg_database_owner;

--
-- TOC entry 4846 (class 0 OID 0)
-- Dependencies: 4
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: pg_database_owner
--

COMMENT ON SCHEMA public IS 'standard public schema';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 225 (class 1259 OID 16471)
-- Name: segment_users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.segment_users (
    segment_user_id integer NOT NULL,
    segment_id integer,
    user_id integer,
    assigned_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.segment_users OWNER TO postgres;

--
-- TOC entry 224 (class 1259 OID 16470)
-- Name: segment_users_segment_user_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.segment_users_segment_user_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.segment_users_segment_user_id_seq OWNER TO postgres;

--
-- TOC entry 4847 (class 0 OID 0)
-- Dependencies: 224
-- Name: segment_users_segment_user_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.segment_users_segment_user_id_seq OWNED BY public.segment_users.segment_user_id;


--
-- TOC entry 219 (class 1259 OID 16416)
-- Name: sessions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sessions (
    session_id integer NOT NULL,
    session_name character varying(255) NOT NULL,
    description text,
    video_url text NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    status character varying(20) DEFAULT 'in_progress'::character varying
);


ALTER TABLE public.sessions OWNER TO postgres;

--
-- TOC entry 218 (class 1259 OID 16415)
-- Name: sessions_session_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.sessions_session_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.sessions_session_id_seq OWNER TO postgres;

--
-- TOC entry 4848 (class 0 OID 0)
-- Dependencies: 218
-- Name: sessions_session_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.sessions_session_id_seq OWNED BY public.sessions.session_id;


--
-- TOC entry 223 (class 1259 OID 16447)
-- Name: subtitles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.subtitles (
    subtitle_id integer NOT NULL,
    segment_id integer,
    text text NOT NULL,
    created_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    last_modified timestamp without time zone DEFAULT now(),
    similarity_score double precision DEFAULT 0.0,
    priority integer DEFAULT 0,
    is_active boolean DEFAULT true
);


ALTER TABLE public.subtitles OWNER TO postgres;

--
-- TOC entry 222 (class 1259 OID 16446)
-- Name: subtitles_subtitle_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.subtitles_subtitle_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.subtitles_subtitle_id_seq OWNER TO postgres;

--
-- TOC entry 4849 (class 0 OID 0)
-- Dependencies: 222
-- Name: subtitles_subtitle_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.subtitles_subtitle_id_seq OWNED BY public.subtitles.subtitle_id;


--
-- TOC entry 226 (class 1259 OID 16488)
-- Name: users_user_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_user_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_user_id_seq OWNER TO postgres;

--
-- TOC entry 217 (class 1259 OID 16405)
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    user_id integer DEFAULT nextval('public.users_user_id_seq'::regclass) NOT NULL,
    username character(50) NOT NULL,
    email character(100) NOT NULL,
    password text NOT NULL,
    role character(20) DEFAULT 'editor'::bpchar,
    created_at timestamp with time zone
);


ALTER TABLE public.users OWNER TO postgres;

--
-- TOC entry 221 (class 1259 OID 16433)
-- Name: video_segments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.video_segments (
    segment_id integer NOT NULL,
    session_id integer,
    start_time time without time zone NOT NULL,
    end_time time without time zone NOT NULL,
    status character varying(20) DEFAULT 'available'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.video_segments OWNER TO postgres;

--
-- TOC entry 220 (class 1259 OID 16432)
-- Name: video_segments_segment_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.video_segments_segment_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.video_segments_segment_id_seq OWNER TO postgres;

--
-- TOC entry 4850 (class 0 OID 0)
-- Dependencies: 220
-- Name: video_segments_segment_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.video_segments_segment_id_seq OWNED BY public.video_segments.segment_id;


--
-- TOC entry 4675 (class 2604 OID 16474)
-- Name: segment_users segment_user_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.segment_users ALTER COLUMN segment_user_id SET DEFAULT nextval('public.segment_users_segment_user_id_seq'::regclass);


--
-- TOC entry 4663 (class 2604 OID 16419)
-- Name: sessions session_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sessions ALTER COLUMN session_id SET DEFAULT nextval('public.sessions_session_id_seq'::regclass);


--
-- TOC entry 4669 (class 2604 OID 16450)
-- Name: subtitles subtitle_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subtitles ALTER COLUMN subtitle_id SET DEFAULT nextval('public.subtitles_subtitle_id_seq'::regclass);


--
-- TOC entry 4666 (class 2604 OID 16436)
-- Name: video_segments segment_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.video_segments ALTER COLUMN segment_id SET DEFAULT nextval('public.video_segments_segment_id_seq'::regclass);


--
-- TOC entry 4688 (class 2606 OID 16477)
-- Name: segment_users segment_users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.segment_users
    ADD CONSTRAINT segment_users_pkey PRIMARY KEY (segment_user_id);


--
-- TOC entry 4682 (class 2606 OID 16425)
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (session_id);


--
-- TOC entry 4686 (class 2606 OID 16459)
-- Name: subtitles subtitles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subtitles
    ADD CONSTRAINT subtitles_pkey PRIMARY KEY (subtitle_id);


--
-- TOC entry 4678 (class 2606 OID 16491)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (user_id);


--
-- TOC entry 4680 (class 2606 OID 16414)
-- Name: users users_username_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_email_key UNIQUE (username, email);


--
-- TOC entry 4684 (class 2606 OID 16440)
-- Name: video_segments video_segments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.video_segments
    ADD CONSTRAINT video_segments_pkey PRIMARY KEY (segment_id);


--
-- TOC entry 4690 (class 2606 OID 16516)
-- Name: subtitles fk_segment; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subtitles
    ADD CONSTRAINT fk_segment FOREIGN KEY (segment_id) REFERENCES public.video_segments(segment_id);


--
-- TOC entry 4691 (class 2606 OID 16509)
-- Name: subtitles fk_segment_id; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subtitles
    ADD CONSTRAINT fk_segment_id FOREIGN KEY (segment_id) REFERENCES public.video_segments(segment_id) ON DELETE CASCADE;


--
-- TOC entry 4694 (class 2606 OID 16478)
-- Name: segment_users segment_users_segment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.segment_users
    ADD CONSTRAINT segment_users_segment_id_fkey FOREIGN KEY (segment_id) REFERENCES public.video_segments(segment_id) ON DELETE CASCADE;


--
-- TOC entry 4695 (class 2606 OID 16502)
-- Name: segment_users segment_users_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.segment_users
    ADD CONSTRAINT segment_users_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id);


--
-- TOC entry 4692 (class 2606 OID 16497)
-- Name: subtitles subtitles_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subtitles
    ADD CONSTRAINT subtitles_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(user_id);


--
-- TOC entry 4693 (class 2606 OID 16460)
-- Name: subtitles subtitles_segment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subtitles
    ADD CONSTRAINT subtitles_segment_id_fkey FOREIGN KEY (segment_id) REFERENCES public.video_segments(segment_id) ON DELETE CASCADE;


--
-- TOC entry 4689 (class 2606 OID 16441)
-- Name: video_segments video_segments_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.video_segments
    ADD CONSTRAINT video_segments_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.sessions(session_id) ON DELETE CASCADE;


-- Completed on 2024-11-24 09:03:45

--
-- PostgreSQL database dump complete
--


import { zodResolver } from "@hookform/resolvers/zod";
import { web3 } from "@project-serum/anchor";
import {
  useAnchorWallet,
  useConnection,
  useWallet,
} from "@solana/wallet-adapter-react";
import { NextPage } from "next";
import Head from "next/head";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "react-toastify";
import { z } from "zod";

import { ConnectWalletCard } from "../../components/ConnectWalletCard";
import { GameCard } from "../../components/GameCard";
import { Layout } from "../../components/Layout";
import { LoadingCard } from "../../components/LoadingCard";
import { NotFoundCard } from "../../components/NotFoundCard";
import { Spinner } from "../../components/Spinner";
import { MINT } from "../../constants/constants";
import { useAdminCloseStaleGame } from "../../hooks/useAdminCloseStaleGame";
import { useCancelGame } from "../../hooks/useCancelGame";
import { useGame } from "../../hooks/useGame";
import { useGameChangesListener } from "../../hooks/useGameSubscription";
import { useIsAdminWallet } from "../../hooks/useIsAdminWallet";
import { useIsGameCreator } from "../../hooks/useIsGameCreator";
import { useSecondPlayerMove } from "../../hooks/useSecondPlayerMove";
import { getSalt, SaltResult } from "../../lib/crypto/crypto";
import { getValueFromEnumVariant } from "../../lib/solana/getValueFromEnumVariant";
import { getChoiceKey, getSaltKey } from "../../lib/storage";
import { capitalize, splitLowerCaseItemIntoWords } from "../../lib/string";
import { CanBeLoading } from "../../types/CanBeLoading";
import { Choice } from "../../types/Choice";

type JoinCardProps = CanBeLoading & {
  onSuccess?: (salt: SaltResult, choice: Choice) => void;
  onCancel?: () => void;
};

const joinSchema = z.object({
  choice: z
    .string({
      required_error: "You must select a choice",
      invalid_type_error: "You must select a choice",
    })
    .refine(
      (choice) => {
        return ["bonk", "paper", "scissors"].includes(choice);
      },
      {
        message: "Invalid choice",
      }
    ),
});

const JoinCard = ({ onSuccess, onCancel, isLoading }: JoinCardProps) => {
  const [salt, setSalt] = useState<SaltResult | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(joinSchema) });
  useEffect(() => {
    const { bytesBs58, randomBytes } = getSalt();
    setSalt({ bytesBs58, randomBytes });
  }, []);
  // const [saltVisible, setSaltVisible] = useState(false);
  return (
    <form
      className="space-y-6 mt-8"
      onSubmit={handleSubmit(({ choice }) => {
        onSuccess?.(salt!, choice as Choice);
      })}
    >
      <div className="bg-white px-4 py-5 shadow sm:rounded-lg sm:p-6">
        <div className="md:grid md:grid-cols-3 md:gap-6">
          <div className="md:col-span-1">
            <h3 className="text-lg font-medium leading-6 text-gray-900">
              Joining a game
            </h3>
            <p className="mt-1 text-sm text-gray-500 text-justify">
              By joining a game you have to provide your choice, which will be
              private until both players reveal. Once revealed, the winner will
              be determined by the bonk, paper, scissors rules.
            </p>
            <p className="mt-1 text-gray-500 text-sm text-justify">
              The winner wins a total of the 90% of the pot (both it's deposit
              and the adversary deposit), while the other 10% is burned 🔥.
            </p>
            <p className="mt-1 text-sm text-red-900 text-justify">
              Once joined, you can't cancel your participation, so make sure you
              are ready to reveal your choice.
            </p>
            <p className="mt-1 text-sm text-red-900 text-justify">
              A player who makes a choice and refuses to reveal is penalized as
              forfeit after 7 days, making the other player the winner, so
              remember to always reveal when prompted.
            </p>
            <p className="mt-1 text-sm text-gray-500 text-justify">
              Don't worry, the game is designed so that you can't lose your
              deposit due to somebody else looking at your choice, that's why we
              use your browser to generate security <b>bytes</b> to hide it
              until both players reveal; this is what we call a salt. Remember
              that you can't win if you never reveal your choice.
            </p>
          </div>

          <div className="mt-5 space-y-6 md:col-span-2 md:mt-0">
            <fieldset>
              <legend className="contents text-sm font-medium text-gray-700">
                Your secret choice
              </legend>
              <div className="mt-4 space-y-4 flex">
                <div className="flex items-center relative">
                  <input
                    id="bonk"
                    type="radio"
                    className="hidden peer"
                    value="bonk"
                    {...register("choice")}
                  />
                  <label
                    htmlFor="bonk"
                    className="text-center text-black peer-checked:text-white block cursor-pointer rounded-lg peer-checked:bg-primary-600 peer-checked:border-transparent peer-checked:ring-2 peer-checked:ring-offset-2 peer-checked:ring-primary-500"
                  >
                    <img src="/bat.png" className="h-48 w-48" />
                    Bonk
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    id="paper"
                    type="radio"
                    className="hidden peer"
                    value="paper"
                    {...register("choice")}
                  />
                  <label
                    htmlFor="paper"
                    className="text-center text-black peer-checked:text-white block cursor-pointer rounded-lg peer-checked:bg-primary-600 peer-checked:border-transparent peer-checked:ring-2 peer-checked:ring-offset-2 peer-checked:ring-primary-500"
                  >
                    <img src="/paper.png" className="h-48 w-48" />
                    Paper
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    id="scissors"
                    type="radio"
                    className="hidden peer"
                    value="scissors"
                    {...register("choice")}
                  />
                  <label
                    htmlFor="scissors"
                    className="text-center text-black peer-checked:text-white block cursor-pointer rounded-lg peer-checked:bg-primary-600 peer-checked:border-transparent peer-checked:ring-2 peer-checked:ring-offset-2 peer-checked:ring-primary-500"
                  >
                    <img src="/scissors.png" className="h-48 w-48" />
                    Scissors
                  </label>
                </div>
              </div>
            </fieldset>
            {errors.choice && (
              <div className="mt-2 text-sm text-red-600">
                {errors.choice?.message as string}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="reset"
          onClick={() => onCancel?.()}
          disabled={isLoading}
          className="rounded-md border border-gray-300 bg-white py-2 px-4 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
        >
          {isLoading ? <Spinner /> : "Cancel"}
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="ml-3 inline-flex justify-center rounded-md border border-transparent bg-primary-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
        >
          {isLoading ? <Spinner /> : "Join Game"}
        </button>
      </div>
    </form>
  );
};

type GameContentsProps = {
  gamePubkey: string;
};

const GameContents = ({ gamePubkey }: GameContentsProps) => {
  const { connection } = useConnection();
  const wallet = useAnchorWallet();
  const { data, error, isLoading, mutate } = useGame(
    new web3.PublicKey(gamePubkey)
  );
  const { publicKey } = useWallet();
  const [salt, setSalt] = useState<SaltResult | null>(null);
  const [choice, setChoice] = useState<Choice | null>(null);
  const [fireSecondPlayerMove, setFireSecondPlayerMove] = useState(0);
  const adminCloseStaleGame = useAdminCloseStaleGame({
    onSuccess: (txId) => {
      toast.success(() => {
        const url = `https://explorer.solana.com/tx/${txId}`;
        return (
          <div className="flex items-center space-x-2">
            <div>Game closed!</div>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-200 underline"
            >
              View on Solana Explorer
            </a>
          </div>
        );
      });
      localStorage.setItem(
        getChoiceKey(gamePubkey, wallet!.publicKey.toBase58()),
        choice!
      );
      localStorage.setItem(
        getSaltKey(gamePubkey, wallet!.publicKey.toBase58()),
        JSON.stringify(salt)
      );
    },
    onError: (err) => toast.error(err.message),
  });
  const cancelGame = useCancelGame({
    onSuccess: (txId) => {
      toast.success(() => {
        const url = `https://explorer.solana.com/tx/${txId}`;
        return (
          <div className="flex items-center space-x-2">
            <div>Game cancelled!</div>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-200 underline"
            >
              View on Solana Explorer
            </a>
          </div>
        );
      });
      localStorage.setItem(
        getChoiceKey(gamePubkey, wallet!.publicKey.toBase58()),
        choice!
      );
      localStorage.setItem(
        getSaltKey(gamePubkey, wallet!.publicKey.toBase58()),
        JSON.stringify(salt)
      );
    },
    onError: (err) => toast.error(err.message),
  });
  const isAdminWallet = useIsAdminWallet();
  const isGameCreator = useIsGameCreator(data?.firstPlayer.toBase58());
  const secondPlayerMove = useSecondPlayerMove({
    onSuccess: ({ txId, salt, gamePDA, choice }) => {
      toast.success(
        () => {
          const url = `https://explorer.solana.com/tx/${txId}`;
          return (
            <div className="flex items-center space-x-2">
              <div>Joined game!</div>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-200 underline"
              >
                View on Solana Explorer
              </a>
            </div>
          );
        },
        { autoClose: false }
      );
      localStorage.setItem(
        getChoiceKey(gamePDA.toBase58(), wallet!.publicKey.toBase58()),
        choice!
      );
      localStorage.setItem(
        getSaltKey(gamePDA.toBase58(), wallet!.publicKey.toBase58()),
        JSON.stringify(salt)
      );
    },
    onError: (err) => toast.error(err.message, { autoClose: false }),
  });

  useGameChangesListener(new web3.PublicKey(gamePubkey), (acc) => {
    mutate(acc);
  });

  useEffect(() => {
    if (fireSecondPlayerMove === 0) return;
    if (!wallet) return;
    if (!salt) return;
    if (!choice) return;
    (async () => {
      toast(() => {
        return (
          <div className="flex items-center space-x-2">
            <Spinner />
            <div>Joining game...</div>
          </div>
        );
      });
      secondPlayerMove.secondPlayerMove({
        dependencies: { wallet, connection },
        payload: {
          choice,
          salt,
          gamePubKey: new web3.PublicKey(gamePubkey),
        },
      });
    })();
  }, [fireSecondPlayerMove]);

  const resetAll = () => {
    setSalt(null);
    setChoice(null);
  };

  const handleOnJoinCardSuccess = (salt: SaltResult, choice: Choice) => {
    setSalt(salt);
    setChoice(choice);
    setFireSecondPlayerMove((v) => v + 1);
  };

  const handleOnJoinCardCancel = () => {
    resetAll();
  };

  if (isLoading) {
    return <LoadingCard message="Loading game" />;
  }

  if (error || !data) {
    console.log({ error });
    return <NotFoundCard />;
  }

  const gameIsJoinable =
    publicKey &&
    !data.firstPlayer.equals(publicKey) &&
    data.gameState.createdAndWaitingForStart;

  const stuffIsLoading = secondPlayerMove.isMutating || isLoading;

  const isAdminClosable =
    isAdminWallet && data.gameState.startedAndWaitingForReveal;

  const isCancellable =
    isGameCreator && data.gameState.createdAndWaitingForStart;

  return (
    <>
      <GameCard
        pubKey={new web3.PublicKey(gamePubkey)}
        gameId={data.gameId}
        firstPlayer={data.firstPlayer}
        mint={data.mint}
        amountToMatch={data.amountToMatch}
        secondPlayer={data.secondPlayer ?? undefined}
        status={capitalize(
          splitLowerCaseItemIntoWords(getValueFromEnumVariant(data.gameState))
        )}
      />
      {gameIsJoinable ? (
        <JoinCard
          onSuccess={handleOnJoinCardSuccess}
          onCancel={handleOnJoinCardCancel}
          isLoading={stuffIsLoading}
        />
      ) : null}
      {isAdminClosable ? (
        <div className="mt-4">
          <button
            type="button"
            onClick={() => {
              adminCloseStaleGame.adminCloseStaleGame({
                dependencies: { wallet: wallet!, connection },
                payload: {
                  gamePubKey: new web3.PublicKey(gamePubkey),
                },
              });
            }}
            className="ml-2 inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            {adminCloseStaleGame.isMutating ? <Spinner /> : "Close Game"}
          </button>
        </div>
      ) : null}
      {isCancellable ? (
        <div className="mt-4">
          <button
            type="button"
            onClick={() => {
              cancelGame.cancelGame({
                dependencies: { wallet: wallet!, connection },
                payload: {
                  gamePubKey: new web3.PublicKey(gamePubkey),
                },
              });
            }}
            className="ml-2 inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            {cancelGame.isMutating ? <Spinner /> : "Cancel Game"}
          </button>
        </div>
      ) : null}
    </>
  );
};

const Game: NextPage = () => {
  const wallet = useAnchorWallet();
  const { query, isReady } = useRouter();
  const { gamePubkey } = query;
  return (
    <>
      <Head>
        <title>BPS App - Create Game</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Layout title="Game">
        <div className="py-4">
          {!wallet ? (
            <ConnectWalletCard />
          ) : isReady && gamePubkey ? (
            <GameContents gamePubkey={gamePubkey as string} />
          ) : (
            <LoadingCard message="Loading game" />
          )}
        </div>
      </Layout>
    </>
  );
};

export default Game;
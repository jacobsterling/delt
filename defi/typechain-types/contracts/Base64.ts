/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */
import type {
  BaseContract,
  BigNumber,
  BigNumberish,
  BytesLike,
  CallOverrides,
  PopulatedTransaction,
  Signer,
  utils,
} from "ethers";
import type { FunctionFragment, Result } from "@ethersproject/abi";
import type { Listener, Provider } from "@ethersproject/providers";
import type {
  TypedEventFilter,
  TypedEvent,
  TypedListener,
  OnEvent,
} from "../common";

export declare namespace Base64 {
  export type IdStruct = {
    itemName: string;
    itemType: string;
    mod: BigNumberish;
  };

  export type IdStructOutput = [string, string, BigNumber] & {
    itemName: string;
    itemType: string;
    mod: BigNumber;
  };
}

export interface Base64Interface extends utils.Interface {
  functions: {
    "tokenURI(string,(string,string,uint256),string)": FunctionFragment;
  };

  getFunction(nameOrSignatureOrTopic: "tokenURI"): FunctionFragment;

  encodeFunctionData(
    functionFragment: "tokenURI",
    values: [string, Base64.IdStruct, string]
  ): string;

  decodeFunctionResult(functionFragment: "tokenURI", data: BytesLike): Result;

  events: {};
}

export interface Base64 extends BaseContract {
  connect(signerOrProvider: Signer | Provider | string): this;
  attach(addressOrName: string): this;
  deployed(): Promise<this>;

  interface: Base64Interface;

  queryFilter<TEvent extends TypedEvent>(
    event: TypedEventFilter<TEvent>,
    fromBlockOrBlockhash?: string | number | undefined,
    toBlock?: string | number | undefined
  ): Promise<Array<TEvent>>;

  listeners<TEvent extends TypedEvent>(
    eventFilter?: TypedEventFilter<TEvent>
  ): Array<TypedListener<TEvent>>;
  listeners(eventName?: string): Array<Listener>;
  removeAllListeners<TEvent extends TypedEvent>(
    eventFilter: TypedEventFilter<TEvent>
  ): this;
  removeAllListeners(eventName?: string): this;
  off: OnEvent<this>;
  on: OnEvent<this>;
  once: OnEvent<this>;
  removeListener: OnEvent<this>;

  functions: {
    tokenURI(
      _attributes: string,
      id: Base64.IdStruct,
      encodedSVG: string,
      overrides?: CallOverrides
    ): Promise<[string]>;
  };

  tokenURI(
    _attributes: string,
    id: Base64.IdStruct,
    encodedSVG: string,
    overrides?: CallOverrides
  ): Promise<string>;

  callStatic: {
    tokenURI(
      _attributes: string,
      id: Base64.IdStruct,
      encodedSVG: string,
      overrides?: CallOverrides
    ): Promise<string>;
  };

  filters: {};

  estimateGas: {
    tokenURI(
      _attributes: string,
      id: Base64.IdStruct,
      encodedSVG: string,
      overrides?: CallOverrides
    ): Promise<BigNumber>;
  };

  populateTransaction: {
    tokenURI(
      _attributes: string,
      id: Base64.IdStruct,
      encodedSVG: string,
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;
  };
}

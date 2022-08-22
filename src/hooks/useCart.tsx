import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    //Busca os dados do local storage
    const storagedCart = localStorage.getItem('@RocketShoes:cart');
    
    if (storagedCart) {
       return JSON.parse(storagedCart);
    }

    return [];
  });

  

  const addProduct = async (productId: number) => {
    try {
      /* É necessário criar esta variavel porque se não todas as alterações
      que seriam feitas iriam afetar diretamente o estado de cart
      o que quebraria o conceito da imutabilidade do react*/
      const updatedCart = [...cart];

      //Verifica se o id do produto que é passado para a função já existe no carrinho
      const productExists = updatedCart.find(product => product.id === productId);

      //Verifica a quantidade existentes no estoque
      const stock = await api.get(`stock/${productId}`);

      //Atribui somente a quantidade a esta variavel
      const stockAmount = stock.data.amount;
      
      //Se o produto já existe no carrinho pega a quantidade se não existe retorna 0
      const currentAmount = productExists ? productExists.amount : 0;

      //Seria quantidade desejada de produtos no carrinho
      const amount = currentAmount + 1;

      /*Se a quantidade solicitada ultrapassar a quantidade existente no stock
      retorna este erro*/
      if (amount > stockAmount){
        toast.error('Quantidade solicitada fora de estoque');
        return; 
      }

      /*Verifica se o produto já existe no carrinho se existir mostra a nova quantidade 
      se não existir busca o produto */
      if(productExists) {
        productExists.amount = amount;
      } else {
        //Busca infos referente ao produto na API
        const product = await api.get(`products/${productId}`)
        
        /*Cria um novo objeto pq na interface de product exist um amount que 
        referencia a quantidade do produto que nao existe na API*/
        const newProduct = {
          ...product.data,
          amount: 1
        }
        //atualiza o updated cart
        updatedCart.push(newProduct);
      }

      //Altera o estado de cart
      setCart(updatedCart);
      //Atualiza os valores no localStorage
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));

    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const updatedCart = [...cart];

      const productIndex = updatedCart.findIndex(product => product.id === productId);

      if(productIndex >= 0){
        updatedCart.splice(productIndex, 1);
        setCart(updatedCart);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
      } else {
        //Força o erro para mostrar a menssagem do toast
        throw Error();
      }
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if(amount <= 0){
        return;
      }

      const stock = await api.get(`stock/${productId}`);

      const stockAmount = stock.data.amount;

      if(amount > stockAmount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      const updatedCart = [...cart];

      const productExists = updatedCart.find(product => product.id === productId);

      if(productExists){
        productExists.amount = amount;
        setCart(updatedCart);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
      } else {
        throw Error();
      }
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
